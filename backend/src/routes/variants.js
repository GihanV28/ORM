import express from 'express'
import { protect } from '../middleware/auth.js'
import { db } from '../config/prisma.js'

const router = express.Router({ mergeParams: true })

// GET /api/products/:productId/variants
router.get('/', protect, async (req, res) => {
  const variants = await db.productVariant.findMany({
    where: { productId: req.params.productId },
    orderBy: { createdAt: 'asc' },
  })
  res.json({ success: true, data: { variants } })
})

// POST /api/products/:productId/variants
router.post('/', protect, async (req, res) => {
  const { sku, price, cost = 0, stock = 0, attributes, status = 'active' } = req.body
  if (!sku || !price) return res.status(400).json({ success: false, message: 'SKU and price required' })

  // Mark parent as variable
  await db.product.update({ where: { id: req.params.productId }, data: { hasVariants: true } })

  const variant = await db.productVariant.create({
    data: {
      productId: req.params.productId,
      sku, price: Number(price), cost: Number(cost),
      stock: Number(stock), attributes: attributes || null, status,
    }
  })

  // Create stock record for variant tracking
  await db.stock.upsert({
    where: { productId: req.params.productId },
    update: { quantity: { increment: Number(stock) } },
    create: { productId: req.params.productId, quantity: Number(stock) },
  })

  res.status(201).json({ success: true, data: { variant } })
})

// PUT /api/products/:productId/variants/:variantId
router.put('/:variantId', protect, async (req, res) => {
  const { sku, price, cost, stock, attributes, status } = req.body
  const variant = await db.productVariant.update({
    where: { id: req.params.variantId },
    data: { sku, price: price ? Number(price) : undefined, cost: cost !== undefined ? Number(cost) : undefined, stock: stock !== undefined ? Number(stock) : undefined, attributes: attributes || undefined, status }
  })
  res.json({ success: true, data: { variant } })
})

// DELETE /api/products/:productId/variants/:variantId
router.delete('/:variantId', protect, async (req, res) => {
  await db.productVariant.delete({ where: { id: req.params.variantId } })
  // If no more variants, unmark parent
  const remaining = await db.productVariant.count({ where: { productId: req.params.productId } })
  if (remaining === 0) await db.product.update({ where: { id: req.params.productId }, data: { hasVariants: false } })
  res.json({ success: true })
})

export default router
