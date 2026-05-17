import express from 'express'
import { protect } from '../middleware/auth.js'
import { db } from '../config/prisma.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  const { page = 1, limit = 25, type } = req.query
  const where = type ? { type } : {}
  const skip = (Number(page) - 1) * Number(limit)
  const [returns, total] = await Promise.all([
    db.orderReturn.findMany({
      where, orderBy: { createdAt: 'desc' }, take: Number(limit), skip,
      include: {
        order: { select: { id: true, orderNumber: true, customerName: true, customerPhone: true, total: true } },
        items: true,
      }
    }),
    db.orderReturn.count({ where }),
  ])

  const stats = await db.orderReturn.aggregate({ _count: { _all: true }, _sum: { refundAmount: true, totalAmount: true } })
  const damageCount = await db.orderReturn.count({ where: { type: 'damage' } })
  const returnCount = await db.orderReturn.count({ where: { type: 'return' } })

  res.json({
    success: true,
    data: {
      returns,
      stats: {
        total: stats._count._all,
        refundValue: stats._sum.refundAmount || 0,
        damageCount,
        returnCount,
      },
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
    }
  })
})

router.get('/:id', protect, async (req, res) => {
  const ret = await db.orderReturn.findUnique({
    where: { id: req.params.id },
    include: { order: true, items: true }
  })
  if (!ret) return res.status(404).json({ success: false, message: 'Return not found' })
  res.json({ success: true, data: { return: ret } })
})

// Search delivered orders for return
router.get('/search/orders', protect, async (req, res) => {
  const { q } = req.query
  if (!q) return res.json({ success: true, data: { orders: [] } })
  const orders = await db.order.findMany({
    where: {
      status: { in: ['delivered', 'completed', 'shipped'] },
      OR: [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q, mode: 'insensitive' } },
      ]
    },
    take: 10,
    select: { id: true, orderNumber: true, customerName: true, customerPhone: true, items: true, total: true, status: true, createdAt: true }
  })
  res.json({ success: true, data: { orders } })
})

router.post('/', protect, async (req, res) => {
  const { orderId, type = 'return', items, refundAmount, reason, notes, restockItems = true } = req.body
  if (!orderId || !items?.length) return res.status(400).json({ success: false, message: 'Order and items required' })

  const order = await db.order.findUnique({ where: { id: orderId } })
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' })

  const count = await db.orderReturn.count()
  const returnNumber = `RET-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`
  const totalAmount = items.reduce((s, i) => s + (i.unitPrice * i.quantity), 0)

  const ret = await db.orderReturn.create({
    data: {
      returnNumber, orderId, type,
      items: { create: items.map(i => ({
        productId: i.productId || null,
        productName: i.productName,
        sku: i.sku || null,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        reason: i.reason || reason || null,
        condition: i.condition || 'good',
      }))},
      totalAmount,
      refundAmount: refundAmount ? Number(refundAmount) : totalAmount,
      reason, notes, restockItems, status: 'completed',
    },
    include: { items: true }
  })

  // Restock if applicable
  if (restockItems) {
    for (const item of items) {
      if (item.productId) {
        await db.stock.upsert({
          where: { productId: item.productId },
          update: { quantity: { increment: Number(item.quantity) } },
          create: { productId: item.productId, quantity: Number(item.quantity) },
        })
        await db.product.update({ where: { id: item.productId }, data: { stock: { increment: Number(item.quantity) } } })
      }
    }
  }

  // Update order status
  await db.order.update({
    where: { id: orderId },
    data: { status: type === 'damage' ? 'damaged' : 'returned' }
  })

  res.status(201).json({ success: true, data: { return: ret } })
})

export default router
