import express from 'express'
import { protect } from '../middleware/auth.js'
import { db } from '../config/prisma.js'
import { createWaybill, assignExistingWaybill } from '../services/fardar.js'

const router = express.Router()

const genOrderNumber = async () => {
  const count = await db.order.count()
  const d = new Date()
  const y = d.getFullYear().toString().slice(-2)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `ORD-AC-${y}${m}-${String(count + 1).padStart(4, '0')}`
}

const calcTotals = (items, shippingCost = 0, discount = 0) => {
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity - (i.discount || 0), 0)
  const total = Math.max(0, subtotal + shippingCost - discount)
  const profit = items.reduce((s, i) => s + (i.unitPrice - (i.unitCost || 0)) * i.quantity, 0)
  return { subtotal, total, profit }
}

router.get('/', protect, async (req, res) => {
  const { status, search, page = 1, limit = 25 } = req.query
  const where = { isPos: false }
  if (status) where.status = status
  if (search) where.OR = [
    { customerName: { contains: search, mode: 'insensitive' } },
    { customerPhone: { contains: search, mode: 'insensitive' } },
    { orderNumber: { contains: search, mode: 'insensitive' } },
  ]

  const skip = (Number(page) - 1) * Number(limit)
  const [orders, total] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: 'desc' }, take: Number(limit), skip }),
    db.order.count({ where }),
  ])

  res.json({
    success: true,
    data: { orders, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } }
  })
})

router.get('/:id', protect, async (req, res) => {
  const order = await db.order.findUnique({
    where: { id: req.params.id },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      assignedEmployee: { select: { id: true, name: true } },
      posSession: { select: { id: true, status: true } },
      returns: { select: { id: true, returnNumber: true, status: true, refundAmount: true } },
    }
  })
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' })
  res.json({ success: true, data: { order } })
})

router.post('/', protect, async (req, res) => {
  const {
    customerName, customerPhone, alternativePhone, customerEmail,
    shippingAddress, addressLine2, city, district, postalCode,
    items, shippingCost = 0, discount = 0,
    paymentMethod = 'cod', notes, internalNotes, deliveryCompany, source = 'manual',
  } = req.body

  if (!customerName || !customerPhone || !shippingAddress || !city || !district) {
    return res.status(400).json({ success: false, message: 'Missing required customer fields' })
  }
  if (!items?.length) return res.status(400).json({ success: false, message: 'Order must have at least one item' })

  // Enrich items with product data
  const enrichedItems = await Promise.all(items.map(async (item) => {
    const product = await db.product.findUnique({ where: { id: item.product } })
    if (!product) throw Object.assign(new Error(`Product not found: ${item.product}`), { status: 422 })
    return {
      productId: product.id,
      productName: product.name,
      sku: product.itemCode,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      unitCost: product.costPrice || 0,
      discount: Number(item.discount) || 0,
      total: item.unitPrice * item.quantity - (item.discount || 0),
    }
  }))

  const { subtotal, total, profit } = calcTotals(enrichedItems, Number(shippingCost), Number(discount))
  const orderNumber = await genOrderNumber()

  // Upsert customer
  let customer = await db.customer.findUnique({ where: { phone: customerPhone } })
  if (!customer) {
    customer = await db.customer.create({
      data: { name: customerName, phone: customerPhone, email: customerEmail, address: shippingAddress, city, district, postalCode }
    })
  }

  const order = await db.order.create({
    data: {
      orderNumber, customerName, customerPhone, alternativePhone, customerEmail,
      shippingAddress, addressLine2, city, district, postalCode,
      items: enrichedItems,
      subtotal, shippingCost: Number(shippingCost), discount: Number(discount), total, profit,
      paymentMethod, notes, internalNotes, deliveryCompany, source,
      customerId: customer.id, status: 'open',
    }
  })

  // Deduct stock
  for (const item of enrichedItems) {
    await db.stock.upsert({
      where: { productId: item.productId },
      update: { quantity: { decrement: item.quantity } },
      create: { productId: item.productId, quantity: -item.quantity },
    })
    await db.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } })
  }

  // Update customer stats
  await db.customer.update({ where: { id: customer.id }, data: { totalOrders: { increment: 1 }, totalSpent: { increment: total } } })

  res.status(201).json({ success: true, data: { order } })
})

router.patch('/:id/status', protect, async (req, res) => {
  const { status, note } = req.body
  const order = await db.order.findUnique({ where: { id: req.params.id } })
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' })

  const history = Array.isArray(order.trackingHistory) ? order.trackingHistory : []
  history.push({
    status,
    timestamp: new Date(),
    note: note || '',
    changedBy: req.adminUser?.name || 'Admin',
    changedById: req.adminUser?.id,
  })

  // Restore stock on cancel/return
  if (['cancelled', 'returned', 'refunded'].includes(status) && !['cancelled', 'returned', 'refunded'].includes(order.status)) {
    const items = Array.isArray(order.items) ? order.items : []
    for (const item of items) {
      if (item.productId) {
        await db.stock.updateMany({ where: { productId: item.productId }, data: { quantity: { increment: item.quantity } } })
        await db.product.updateMany({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } })
      }
    }
  }

  const updated = await db.order.update({
    where: { id: req.params.id },
    data: { status, trackingHistory: history }
  })
  res.json({ success: true, data: { order: updated } })
})

router.patch('/:id/payment', protect, async (req, res) => {
  const { paymentStatus, paymentMethod, codAmount, codCollectedAt } = req.body
  const updated = await db.order.update({
    where: { id: req.params.id },
    data: {
      paymentStatus, paymentMethod,
      codAmount: codAmount ? Number(codAmount) : undefined,
      codCollectedAt: codCollectedAt ? new Date(codCollectedAt) : (paymentStatus === 'paid' ? new Date() : undefined),
    }
  })
  res.json({ success: true, data: { order: updated } })
})

router.patch('/:id/call', protect, async (req, res) => {
  const { notes } = req.body
  const order = await db.order.findUnique({ where: { id: req.params.id } })
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' })

  const history = Array.isArray(order.trackingHistory) ? order.trackingHistory : []
  history.push({
    status: 'called',
    timestamp: new Date(),
    note: notes || 'Call recorded',
    changedBy: req.adminUser?.name || 'Admin',
  })

  const updated = await db.order.update({
    where: { id: req.params.id },
    data: { calledAt: new Date(), callNotes: notes || null, trackingHistory: history }
  })
  res.json({ success: true, data: { order: updated } })
})

router.delete('/:id', protect, async (req, res) => {
  await db.order.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

// PUT /api/orders/:id — edit order (items, customer info, notes, shipping)
router.put('/:id', protect, async (req, res) => {
  const {
    customerName, customerPhone, alternativePhone, customerEmail,
    shippingAddress, addressLine2, city, district, postalCode,
    items, shippingCost = 0, discount = 0,
    paymentMethod, notes, internalNotes, deliveryCompany,
  } = req.body

  const existing = await db.order.findUnique({ where: { id: req.params.id } })
  if (!existing) return res.status(404).json({ success: false, message: 'Order not found' })

  // Restore stock for old items
  const oldItems = Array.isArray(existing.items) ? existing.items : []
  for (const item of oldItems) {
    if (item.productId) {
      await db.stock.updateMany({ where: { productId: item.productId }, data: { quantity: { increment: item.quantity } } })
      await db.product.updateMany({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } })
    }
  }

  // Enrich new items
  const enrichedItems = await Promise.all((items || []).map(async (item) => {
    const product = item.product ? await db.product.findUnique({ where: { id: item.product } }) : null
    return {
      productId: product?.id || item.productId,
      productName: product?.name || item.productName,
      sku: product?.itemCode || item.sku,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      unitCost: product?.costPrice || item.unitCost || 0,
      discount: Number(item.discount) || 0,
      total: Number(item.unitPrice) * Number(item.quantity) - (Number(item.discount) || 0),
    }
  }))

  const { subtotal, total, profit } = calcTotals(enrichedItems, Number(shippingCost), Number(discount))

  // Deduct stock for new items
  for (const item of enrichedItems) {
    if (item.productId) {
      await db.stock.upsert({
        where: { productId: item.productId },
        update: { quantity: { decrement: item.quantity } },
        create: { productId: item.productId, quantity: -item.quantity },
      })
      await db.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } })
    }
  }

  const updated = await db.order.update({
    where: { id: req.params.id },
    data: {
      customerName, customerPhone, alternativePhone, customerEmail,
      shippingAddress, addressLine2, city, district, postalCode,
      items: enrichedItems,
      subtotal, shippingCost: Number(shippingCost), discount: Number(discount), total, profit,
      paymentMethod, notes, internalNotes, deliveryCompany,
    }
  })
  res.json({ success: true, data: { order: updated } })
})

// POST /api/orders/:id/dispatch — send to Fardar Express, get waybill number
router.post('/:id/dispatch', protect, async (req, res) => {
  const { weight = '0.5', description, exchange = '0', existingWaybillId } = req.body

  const order = await db.order.findUnique({ where: { id: req.params.id } })
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' })
  if (order.waybillNumber) return res.status(400).json({ success: false, message: `Already dispatched. Waybill: ${order.waybillNumber}` })

  let waybillNo
  if (existingWaybillId) {
    waybillNo = await assignExistingWaybill({ order, waybillId: existingWaybillId, weight, description, exchange })
  } else {
    waybillNo = await createWaybill({ order, weight, description, exchange })
  }

  const history = Array.isArray(order.trackingHistory) ? order.trackingHistory : []
  history.push({ status: 'dispatched', timestamp: new Date(), note: `Fardar waybill created: ${waybillNo}` })

  const updated = await db.order.update({
    where: { id: req.params.id },
    data: {
      waybillNumber: waybillNo,
      deliveryCompany: 'Fardar Express Domestic',
      waybillSyncedAt: new Date(),
      status: 'dispatched',
      trackingHistory: history,
    }
  })

  res.json({ success: true, data: { order: updated, waybillNumber: waybillNo } })
})

export default router
