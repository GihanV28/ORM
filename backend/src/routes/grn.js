import express from 'express'
import { protect } from '../middleware/auth.js'
import { db } from '../config/prisma.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  const { page = 1, limit = 25 } = req.query
  const skip = (Number(page) - 1) * Number(limit)
  const [grns, total] = await Promise.all([
    db.grn.findMany({
      orderBy: { createdAt: 'desc' }, take: Number(limit), skip,
      include: { supplier: { select: { id: true, name: true } }, _count: { select: { items: true } } }
    }),
    db.grn.count(),
  ])
  res.json({ success: true, data: { grns, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } } })
})

router.get('/:id', protect, async (req, res) => {
  const grn = await db.grn.findUnique({
    where: { id: req.params.id },
    include: { supplier: true, purchaseOrder: { select: { id: true, poNumber: true } }, items: { include: { product: { select: { id: true, name: true, itemCode: true } } } } }
  })
  if (!grn) return res.status(404).json({ success: false, message: 'GRN not found' })
  res.json({ success: true, data: { grn } })
})

router.post('/', protect, async (req, res) => {
  const { supplierId, purchaseOrderId, items = [], receivedDate, notes } = req.body
  const count = await db.grn.count()
  const grnNumber = `GRN-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

  const enrichedItems = await Promise.all(items.map(async (item) => {
    const product = item.productId ? await db.product.findUnique({ where: { id: item.productId } }) : null
    return {
      productId: item.productId || null,
      productName: product?.name || item.productName || 'Unknown',
      sku: product?.itemCode || item.sku || null,
      quantity: Number(item.quantity),
      unitCost: Number(item.unitCost),
      total: Number(item.quantity) * Number(item.unitCost),
    }
  }))

  const totalAmount = enrichedItems.reduce((s, i) => s + i.total, 0)

  const grn = await db.grn.create({
    data: {
      grnNumber, supplierId: supplierId || null,
      purchaseOrderId: purchaseOrderId || null,
      items: { create: enrichedItems },
      totalAmount, status: 'received',
      receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
      notes,
    },
    include: { supplier: true, items: true }
  })

  // Update stock for each item
  for (const item of enrichedItems) {
    if (item.productId) {
      await db.stock.upsert({
        where: { productId: item.productId },
        update: { quantity: { increment: item.quantity } },
        create: { productId: item.productId, quantity: item.quantity },
      })
      await db.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } })
    }
  }

  res.status(201).json({ success: true, data: { grn } })
})

export default router
