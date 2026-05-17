import express from 'express'
import { protect } from '../middleware/auth.js'
import { db } from '../config/prisma.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  const { search, limit = 100 } = req.query
  const where = search
    ? { product: { OR: [{ name: { contains: search, mode: 'insensitive' } }, { itemCode: { contains: search, mode: 'insensitive' } }] } }
    : {}

  const stock = await db.stock.findMany({
    where, take: Number(limit),
    include: { product: { select: { id: true, name: true, itemCode: true, minStock: true, status: true, costPrice: true } } },
    orderBy: { quantity: 'asc' },
  })

  const [lowStockCount, outOfStockCount, totalProducts] = await Promise.all([
    db.stock.count({ where: { quantity: { lte: 5, gt: 0 } } }),
    db.stock.count({ where: { quantity: { lte: 0 } } }),
    db.product.count(),
  ])

  const result = stock.map(s => ({
    ...s,
    product: s.product ? { ...s.product, sku: s.product.itemCode } : null
  }))

  res.json({ success: true, data: { stock: result, summary: { totalProducts, lowStockCount, outOfStockCount } } })
})

router.get('/history', protect, async (req, res) => {
  const { productId, type, from, to, page = 1, limit = 50 } = req.query

  // Get stock records with movements and filter
  const stockWhere = {}
  if (productId) stockWhere.productId = productId

  const allStock = await db.stock.findMany({
    where: stockWhere,
    include: {
      product: { select: { id: true, name: true, itemCode: true } },
      movements: {
        orderBy: { createdAt: 'desc' },
        where: {
          ...(type ? { type } : {}),
          ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to + 'T23:59:59') } : {}) } } : {}),
        },
      }
    }
  })

  // Flatten movements
  let movements = []
  for (const s of allStock) {
    for (const m of s.movements) {
      movements.push({
        ...m,
        product: s.product,
        productId: s.productId,
      })
    }
  }

  // Sort by date desc
  movements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const total = movements.length
  const skip = (Number(page) - 1) * Number(limit)
  movements = movements.slice(skip, skip + Number(limit))

  res.json({ success: true, data: { movements, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } } })
})

router.get('/export', protect, async (req, res) => {
  const stock = await db.stock.findMany({
    include: { product: { select: { name: true, itemCode: true, costPrice: true, minStock: true, status: true, category: { select: { name: true } } } } },
    orderBy: { quantity: 'asc' },
  })

  const rows = ['SKU,Product Name,Category,Current Stock,Min Stock,Status,Cost Price,Stock Value']
  for (const s of stock) {
    const p = s.product
    if (!p) continue
    const status = s.quantity <= 0 ? 'Out of Stock' : s.quantity <= (p.minStock || 5) ? 'Low Stock' : 'In Stock'
    const value = s.quantity * (p.costPrice || 0)
    rows.push(`"${p.itemCode || ''}","${p.name}","${p.category?.name || ''}",${s.quantity},${p.minStock || 5},"${status}",${p.costPrice || 0},${value}`)
  }

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename="stock-export.csv"')
  res.send(rows.join('\n'))
})

router.get('/:productId', protect, async (req, res) => {
  const record = await db.stock.findFirst({
    where: { product: { id: req.params.productId } },
    include: { movements: { orderBy: { createdAt: 'desc' }, take: 100 }, product: { select: { name: true, itemCode: true, minStock: true } } }
  })
  if (!record) return res.status(404).json({ success: false, message: 'Stock record not found' })
  res.json({ success: true, data: { stock: record } })
})

router.post('/:productId/adjust', protect, async (req, res) => {
  const { type, quantity, note, reference } = req.body
  if (!type || !quantity) return res.status(400).json({ success: false, message: 'Type and quantity required' })

  const qty = Number(quantity)
  const delta = type === 'out' ? -qty : qty

  const stock = await db.stock.upsert({
    where: { productId: req.params.productId },
    update: { quantity: { increment: delta } },
    create: { productId: req.params.productId, quantity: delta },
  })

  await db.stockMovement.create({
    data: { stockId: stock.id, type, quantity: qty, note, reference }
  })

  await db.product.update({ where: { id: req.params.productId }, data: { stock: Math.max(0, stock.quantity) } })

  res.json({ success: true, data: { stock } })
})

export default router
