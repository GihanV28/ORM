import express from 'express'
import { db } from '../config/prisma.js'

const router = express.Router()

// API key middleware
const requireApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key']
  if (!apiKey) return res.status(401).json({ success: false, message: 'API key required' })
  const admin = await db.adminUser.findUnique({ where: { apiKey } })
  if (!admin) return res.status(401).json({ success: false, message: 'Invalid API key' })
  req.adminUser = admin
  next()
}

const genOrderNumber = async () => {
  const count = await db.order.count()
  const d = new Date()
  const y = d.getFullYear().toString().slice(-2)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `ORD-AC-${y}${m}-${String(count + 1).padStart(4, '0')}`
}

// POST /api/v1/external/orders — create order from e-commerce site
router.post('/orders', requireApiKey, async (req, res) => {
  const {
    customerName, customerPhone, alternativePhone, customerEmail,
    shippingAddress, addressLine2, city, district, postalCode,
    items, shippingCost = 0, discount = 0,
    paymentMethod = 'cod', paymentStatus = 'pending',
    notes, source = 'ecommerce', externalOrderId, deliveryCompany, waybillNumber,
  } = req.body

  if (!customerName || !customerPhone || !shippingAddress || !city || !district) {
    return res.status(400).json({ success: false, message: 'Missing required customer fields' })
  }
  if (!items?.length) return res.status(400).json({ success: false, message: 'At least one item required' })

  const enrichedItems = await Promise.all(items.map(async (item) => {
    const product = await db.product.findFirst({ where: { itemCode: item.sku } })
    if (!product) return res.status(400).json({ success: false, message: `Product not found: ${item.sku}` })
    return {
      productId: product.id, productName: product.name, sku: product.itemCode,
      quantity: item.quantity,
      unitPrice: item.unitPrice ?? product.price,
      unitCost: product.costPrice || 0,
      discount: item.discount || 0,
      total: (item.unitPrice ?? product.price) * item.quantity - (item.discount || 0),
    }
  }))

  const subtotal = enrichedItems.reduce((s, i) => s + i.unitPrice * i.quantity - (i.discount || 0), 0)
  const total = Math.max(0, subtotal + Number(shippingCost) - Number(discount))
  const profit = enrichedItems.reduce((s, i) => s + (i.unitPrice - i.unitCost) * i.quantity, 0)

  let customer = await db.customer.findUnique({ where: { phone: customerPhone } })
  if (!customer) {
    customer = await db.customer.create({
      data: { name: customerName, phone: customerPhone, email: customerEmail, address: shippingAddress, city, district, postalCode }
    })
  }

  const orderNumber = await genOrderNumber()

  const order = await db.order.create({
    data: {
      orderNumber, customerName, customerPhone, alternativePhone, customerEmail,
      shippingAddress, addressLine2, city, district, postalCode,
      items: enrichedItems, subtotal, shippingCost: Number(shippingCost), discount: Number(discount), total, profit,
      paymentMethod, paymentStatus, notes, source, status: 'open',
      externalOrderId: externalOrderId || null,
      deliveryCompany, waybillNumber,
      customerId: customer.id,
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

  await db.customer.update({ where: { id: customer.id }, data: { totalOrders: { increment: 1 }, totalSpent: { increment: total } } })

  res.status(201).json({ success: true, data: { orderId: order.id, orderNumber: order.orderNumber, totalAmount: order.total, status: order.status } })
})

// GET /api/v1/external/orders/:orderNumber
router.get('/orders/:orderNumber', requireApiKey, async (req, res) => {
  const order = await db.order.findFirst({
    where: { orderNumber: req.params.orderNumber },
    select: { id: true, orderNumber: true, status: true, paymentStatus: true, total: true, deliveryCompany: true, waybillNumber: true, createdAt: true }
  })
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' })
  res.json({ success: true, data: { order } })
})

export default router
