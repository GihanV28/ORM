import express from 'express'
import { protect } from '../middleware/auth.js'
import { db } from '../config/prisma.js'

const router = express.Router()

// ===== SESSIONS =====

router.get('/sessions', protect, async (req, res) => {
  const { page = 1, limit = 25 } = req.query
  const skip = (Number(page) - 1) * Number(limit)
  const [sessions, total] = await Promise.all([
    db.posSession.findMany({ orderBy: { openedAt: 'desc' }, take: Number(limit), skip }),
    db.posSession.count(),
  ])
  res.json({ success: true, data: { sessions, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } } })
})

router.get('/session/current', protect, async (req, res) => {
  const session = await db.posSession.findFirst({ where: { status: 'open' }, orderBy: { openedAt: 'desc' } })
  res.json({ success: true, data: { session } })
})

router.post('/session/open', protect, async (req, res) => {
  const existing = await db.posSession.findFirst({ where: { status: 'open' } })
  if (existing) return res.status(400).json({ success: false, message: 'A session is already open', data: { session: existing } })
  const session = await db.posSession.create({ data: { openingCash: Number(req.body.openingCash) || 0, notes: req.body.notes } })
  res.status(201).json({ success: true, data: { session } })
})

router.get('/session/:id', protect, async (req, res) => {
  const session = await db.posSession.findUnique({ where: { id: req.params.id } })
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' })
  const orders = await db.order.findMany({ where: { posSessionId: req.params.id }, orderBy: { createdAt: 'desc' } })
  const byMethod = {}
  for (const o of orders) {
    byMethod[o.paymentMethod] = (byMethod[o.paymentMethod] || 0) + o.total
  }
  res.json({ success: true, data: { session, orders, byMethod } })
})

router.post('/session/:id/close', protect, async (req, res) => {
  const { closingCash, notes } = req.body
  const session = await db.posSession.findUnique({ where: { id: req.params.id } })
  if (!session || session.status !== 'open') return res.status(400).json({ success: false, message: 'Session not found or already closed' })

  const updated = await db.posSession.update({
    where: { id: req.params.id },
    data: { status: 'closed', closedAt: new Date(), closingCash: Number(closingCash) || 0, notes: notes || null }
  })
  res.json({ success: true, data: { session: updated } })
})

// ===== SALES =====

router.get('/sales', protect, async (req, res) => {
  const { sessionId, date, page = 1, limit = 50 } = req.query
  const where = { isPos: true }
  if (sessionId) where.posSessionId = sessionId
  if (date) { const d = new Date(date); where.createdAt = { gte: d, lt: new Date(d.getTime() + 86400000) } }
  const skip = (Number(page) - 1) * Number(limit)
  const [orders, total] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: 'desc' }, take: Number(limit), skip }),
    db.order.count({ where }),
  ])
  res.json({ success: true, data: { orders, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } } })
})

router.get('/today-summary', protect, async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const where = { isPos: true, createdAt: { gte: today } }
  const [agg, byMethod] = await Promise.all([
    db.order.aggregate({ where, _sum: { total: true }, _count: { _all: true } }),
    db.order.groupBy({ by: ['paymentMethod'], where, _sum: { total: true }, _count: { _all: true } }),
  ])
  res.json({ success: true, data: { revenue: agg._sum.total || 0, orders: agg._count._all, byMethod } })
})

// ===== POS SALE =====

router.post('/sale', protect, async (req, res) => {
  const { sessionId, items, paymentMethod = 'cash', customerName = 'Walk-in Customer', customerPhone = '0000000000', discount = 0, notes } = req.body

  let session = sessionId
    ? await db.posSession.findUnique({ where: { id: sessionId } })
    : await db.posSession.findFirst({ where: { status: 'open' } })

  const enrichedItems = await Promise.all(items.map(async (item) => {
    const product = await db.product.findUnique({ where: { id: item.product } })
    if (!product) throw Object.assign(new Error('Product not found'), { status: 422 })
    return { productId: product.id, productName: product.name, sku: product.itemCode, quantity: item.quantity, unitPrice: item.unitPrice ?? product.price, unitCost: product.costPrice || 0, discount: 0, total: (item.unitPrice ?? product.price) * item.quantity }
  }))

  const subtotal = enrichedItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const total = Math.max(0, subtotal - Number(discount))

  const order = await db.order.create({
    data: {
      orderNumber: `POS-${Date.now()}`,
      customerName, customerPhone,
      shippingAddress: 'POS Sale', city: 'Walk-in', district: 'Walk-in',
      items: enrichedItems, subtotal, total,
      shippingCost: 0, discount: Number(discount),
      paymentMethod, paymentStatus: 'paid', status: 'completed',
      isPos: true, posSessionId: session?.id || null,
      source: 'pos', notes: notes || null,
    }
  })

  for (const item of enrichedItems) {
    await db.stock.upsert({
      where: { productId: item.productId },
      update: { quantity: { decrement: item.quantity } },
      create: { productId: item.productId, quantity: -item.quantity },
    })
    await db.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } })
    if (session) {
      await db.stockMovement.create({ data: { stockId: (await db.stock.findUnique({ where: { productId: item.productId } }))?.id || '', type: 'out', quantity: item.quantity, reference: 'pos_sale', note: `POS Sale ${order.orderNumber}` } })
    }
  }

  if (session) {
    await db.posSession.update({ where: { id: session.id }, data: { totalSales: { increment: total }, totalOrders: { increment: 1 } } })
  }

  res.status(201).json({ success: true, data: { order } })
})

// GET receipt data
router.get('/receipt/:orderId', protect, async (req, res) => {
  const order = await db.order.findUnique({ where: { id: req.params.orderId } })
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' })
  const settings = await db.adminUser.findFirst({ select: { businessName: true, phone: true, address: true, settings: true } })
  res.json({ success: true, data: { order, business: settings } })
})

// POS returns — search orders
router.get('/returns/search', protect, async (req, res) => {
  const { q } = req.query
  if (!q) return res.json({ success: true, data: { orders: [] } })
  const orders = await db.order.findMany({
    where: { isPos: true, OR: [{ orderNumber: { contains: q, mode: 'insensitive' } }, { customerPhone: { contains: q, mode: 'insensitive' } }] },
    take: 10
  })
  res.json({ success: true, data: { orders } })
})

// Process POS return/exchange/damage
router.post('/returns', protect, async (req, res) => {
  const { orderId, type = 'return', items, refundAmount, exchangeItems = [], notes } = req.body
  const order = await db.order.findUnique({ where: { id: orderId } })
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' })

  const count = await db.orderReturn.count()
  const returnNumber = `POS-RET-${Date.now()}`
  const totalAmount = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)

  const ret = await db.orderReturn.create({
    data: {
      returnNumber, orderId, type,
      items: { create: items.map(i => ({ productId: i.productId || null, productName: i.productName, sku: i.sku || null, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), condition: i.condition || 'good' })) },
      totalAmount, refundAmount: refundAmount ? Number(refundAmount) : totalAmount,
      notes, status: 'completed', restockItems: type !== 'damage',
    },
    include: { items: true }
  })

  // Restock returned items (not damaged)
  if (type !== 'damage') {
    for (const item of items) {
      if (item.productId) {
        await db.stock.upsert({ where: { productId: item.productId }, update: { quantity: { increment: Number(item.quantity) } }, create: { productId: item.productId, quantity: Number(item.quantity) } })
        await db.product.update({ where: { id: item.productId }, data: { stock: { increment: Number(item.quantity) } } })
      }
    }
  }

  // Create exchange sale if needed
  let exchangeOrder = null
  if (type === 'exchange' && exchangeItems.length) {
    const exItems = await Promise.all(exchangeItems.map(async (item) => {
      const product = await db.product.findUnique({ where: { id: item.product } })
      return { productId: product?.id, productName: product?.name || item.productName, sku: product?.itemCode, quantity: item.quantity, unitPrice: item.unitPrice ?? product?.price ?? 0, unitCost: product?.costPrice || 0, total: (item.unitPrice ?? product?.price ?? 0) * item.quantity }
    }))
    const exTotal = exItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
    exchangeOrder = await db.order.create({
      data: {
        orderNumber: `POS-EX-${Date.now()}`, customerName: order.customerName, customerPhone: order.customerPhone,
        shippingAddress: 'POS Exchange', city: 'Walk-in', district: 'Walk-in',
        items: exItems, subtotal: exTotal, total: Math.max(0, exTotal - totalAmount),
        paymentMethod: order.paymentMethod, paymentStatus: 'paid', status: 'completed',
        isPos: true, source: 'pos',
      }
    })
    for (const item of exItems) {
      if (item.productId) {
        await db.stock.upsert({ where: { productId: item.productId }, update: { quantity: { decrement: item.quantity } }, create: { productId: item.productId, quantity: -item.quantity } })
        await db.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } })
      }
    }
  }

  res.status(201).json({ success: true, data: { return: ret, exchangeOrder } })
})

export default router
