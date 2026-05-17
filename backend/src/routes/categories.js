import express from 'express'
import { protect } from '../middleware/auth.js'
import { db } from '../config/prisma.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  const categories = await db.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } }
  })
  res.json({ success: true, data: { categories } })
})

router.post('/', protect, async (req, res) => {
  const { name, description, parentId } = req.body
  if (!name) return res.status(400).json({ success: false, message: 'Name required' })
  const category = await db.category.create({ data: { name, description, parentId: parentId || null } })
  res.status(201).json({ success: true, data: { category } })
})

router.put('/:id', protect, async (req, res) => {
  const { name, description, parentId } = req.body
  const category = await db.category.update({
    where: { id: req.params.id },
    data: { name, description, parentId: parentId || null }
  })
  res.json({ success: true, data: { category } })
})

router.delete('/:id', protect, async (req, res) => {
  await db.category.delete({ where: { id: req.params.id } })
  res.json({ success: true, message: 'Category deleted' })
})

export default router
