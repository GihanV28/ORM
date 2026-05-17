import express from 'express'
import { protect } from '../middleware/auth.js'
import { db } from '../config/prisma.js'

const router = express.Router()

// Map DB product to API response (itemCode → sku)
const toProduct = (p) => p ? { ...p, sku: p.itemCode } : null

router.get('/', protect, async (req, res) => {
  const { search, status, categoryId, limit = 50, page = 1 } = req.query
  const where = {}
  if (search) where.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    { itemCode: { contains: search, mode: 'insensitive' } },
    { barcode: { contains: search, mode: 'insensitive' } },
  ]
  if (status) where.status = status
  if (categoryId) where.categoryId = categoryId

  const skip = (Number(page) - 1) * Number(limit)
  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip,
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { order: 'asc' }, take: 1 },
        stockRecord: { select: { quantity: true, reservedQuantity: true } },
      }
    }),
    db.product.count({ where }),
  ])

  res.json({
    success: true,
    data: {
      products: products.map(toProduct),
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
    }
  })
})

router.get('/:id', protect, async (req, res) => {
  const product = await db.product.findUnique({
    where: { id: req.params.id },
    include: {
      category: true,
      images: { orderBy: { order: 'asc' } },
      sizes: true,
      collections: { include: { collection: true } },
      stockRecord: true,
    }
  })
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' })
  res.json({ success: true, data: { product: toProduct(product) } })
})

router.post('/', protect, async (req, res) => {
  const { sku, name, barcode, categoryId, description, sellingPrice, costPrice, comparePrice,
    status = 'active', hasVariants, variants, minStock = 5, unit, weight, batchNumber, productNotes } = req.body

  if (!name || !sellingPrice) return res.status(400).json({ success: false, message: 'Name and selling price required' })

  // Auto-generate slug
  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const existing = await db.product.findFirst({ where: { slug: { startsWith: baseSlug } }, orderBy: { slug: 'desc' } })
  const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug

  const product = await db.product.create({
    data: {
      name, slug,
      itemCode: sku || null,
      barcode, description,
      price: Number(sellingPrice),
      costPrice: Number(costPrice) || 0,
      comparePrice: comparePrice ? Number(comparePrice) : null,
      status,
      hasVariants: !!hasVariants,
      variants: variants || null,
      minStock: Number(minStock),
      unit, weight: weight ? Number(weight) : null,
      batchNumber, productNotes,
      categoryId: categoryId || null,
    },
    include: { category: { select: { id: true, name: true } } }
  })

  // Create stock record
  await db.stock.create({ data: { productId: product.id, quantity: 0 } })

  res.status(201).json({ success: true, data: { product: toProduct(product) } })
})

router.put('/:id', protect, async (req, res) => {
  const { sku, name, barcode, categoryId, description, sellingPrice, costPrice, comparePrice,
    status, hasVariants, variants, minStock, unit, weight, batchNumber, productNotes } = req.body

  const product = await db.product.update({
    where: { id: req.params.id },
    data: {
      name,
      itemCode: sku || null,
      barcode, description,
      price: sellingPrice ? Number(sellingPrice) : undefined,
      costPrice: costPrice !== undefined ? Number(costPrice) : undefined,
      comparePrice: comparePrice ? Number(comparePrice) : null,
      status,
      hasVariants: hasVariants !== undefined ? !!hasVariants : undefined,
      variants: variants || null,
      minStock: minStock !== undefined ? Number(minStock) : undefined,
      unit, weight: weight ? Number(weight) : null,
      batchNumber, productNotes,
      categoryId: categoryId || null,
    },
    include: { category: { select: { id: true, name: true } } }
  })
  res.json({ success: true, data: { product: toProduct(product) } })
})

router.delete('/:id', protect, async (req, res) => {
  await db.product.delete({ where: { id: req.params.id } })
  res.json({ success: true, message: 'Product deleted' })
})

export default router
