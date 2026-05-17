import express from 'express'
import { protect } from '../middleware/auth.js'
import { db } from '../config/prisma.js'

const router = express.Router()

// Product search for autocomplete
router.get('/search/products', protect, async (req, res) => {
  const { q, limit = 20 } = req.query
  const where = { status: { in: ['active', 'published'] } }
  if (q) where.OR = [
    { name: { contains: q, mode: 'insensitive' } },
    { itemCode: { contains: q, mode: 'insensitive' } },
    { barcode: { contains: q, mode: 'insensitive' } },
  ]
  const products = await db.product.findMany({
    where,
    take: Number(limit),
    select: { id: true, name: true, itemCode: true, barcode: true, price: true, costPrice: true, unit: true },
    include: { stockRecord: { select: { quantity: true, reservedQuantity: true } } }
  })
  const results = products.map(p => ({
    ...p, sku: p.itemCode, sellingPrice: p.price,
    stock: p.stockRecord ? p.stockRecord.quantity - p.stockRecord.reservedQuantity : 0,
  }))
  res.json({ success: true, data: { products: results } })
})

// Customer search
router.get('/search/customers', protect, async (req, res) => {
  const { q, limit = 20 } = req.query
  const where = q ? { OR: [
    { name: { contains: q, mode: 'insensitive' } },
    { phone: { contains: q, mode: 'insensitive' } },
    { email: { contains: q, mode: 'insensitive' } },
  ]} : {}
  const customers = await db.customer.findMany({
    where, take: Number(limit),
    select: { id: true, name: true, phone: true, email: true, address: true, city: true }
  })
  res.json({ success: true, data: { customers } })
})

// Barcode / SKU lookup for POS
router.get('/product/lookup', protect, async (req, res) => {
  const { sku, barcode } = req.query
  if (!sku && !barcode) return res.status(400).json({ success: false, message: 'Provide sku or barcode' })
  const where = sku ? { itemCode: sku } : { barcode }
  const product = await db.product.findFirst({ where, include: { stockRecord: true } })
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' })
  const available = product.stockRecord ? product.stockRecord.quantity - product.stockRecord.reservedQuantity : 0
  res.json({ success: true, data: { product: { ...product, sku: product.itemCode, sellingPrice: product.price, availableStock: available } } })
})

export default router
