import express from 'express'
import { protect } from '../middleware/auth.js'
import { db } from '../config/prisma.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  const { page = 1, limit = 25 } = req.query
  const skip = (Number(page) - 1) * Number(limit)
  const [purchaseOrders, total] = await Promise.all([
    db.purchaseOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: Number(limit), skip,
      include: { supplier: { select: { id: true, name: true } }, _count: { select: { items: true } } }
    }),
    db.purchaseOrder.count(),
  ])
  res.json({ success: true, data: { purchaseOrders, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } } })
})

router.post('/', protect, async (req, res) => {
  const { supplierId, items, expectedDate, notes } = req.body
  const count = await db.purchaseOrder.count()
  const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

  const enrichedItems = await Promise.all((items || []).map(async (item) => {
    const product = item.productId ? await db.product.findUnique({ where: { id: item.productId } }) : null
    return {
      productId: item.productId || null,
      productName: product?.name || item.productName || 'Unknown',
      sku: product?.itemCode || item.sku || null,
      quantity: item.quantity, receivedQuantity: 0,
      unitCost: Number(item.unitCost) || 0,
      total: (Number(item.unitCost) || 0) * item.quantity,
    }
  }))

  const subtotal = enrichedItems.reduce((s, i) => s + i.total, 0)

  const po = await db.purchaseOrder.create({
    data: {
      poNumber, supplierId: supplierId || null,
      items: { create: enrichedItems },
      subtotal, totalAmount: subtotal,
      expectedDate: expectedDate ? new Date(expectedDate) : null,
      notes,
    },
    include: { supplier: true, items: true }
  })
  res.status(201).json({ success: true, data: { purchaseOrder: po } })
})

router.patch('/:id/receive', protect, async (req, res) => {
  const { items } = req.body
  for (const item of items || []) {
    await db.purchaseOrderItem.update({
      where: { id: item.id },
      data: { receivedQuantity: { increment: item.receivedQty } }
    })
    if (item.productId && item.receivedQty) {
      await db.stock.upsert({
        where: { productId: item.productId },
        update: { quantity: { increment: item.receivedQty } },
        create: { productId: item.productId, quantity: item.receivedQty },
      })
      await db.product.update({ where: { id: item.productId }, data: { stock: { increment: item.receivedQty } } })
    }
  }
  const po = await db.purchaseOrder.update({
    where: { id: req.params.id },
    data: { status: 'received', receivedDate: new Date() },
    include: { items: true }
  })
  res.json({ success: true, data: { purchaseOrder: po } })
})

export default router
