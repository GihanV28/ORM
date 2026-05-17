import express from 'express'
import { protect } from '../middleware/auth.js'
import { db } from '../config/prisma.js'

const router = express.Router()

// GET all attributes with values
router.get('/', protect, async (req, res) => {
  const attributes = await db.variationAttribute.findMany({
    orderBy: { name: 'asc' },
    include: { values: { orderBy: { value: 'asc' } } },
  })
  res.json({ success: true, data: { attributes } })
})

// POST create attribute
router.post('/', protect, async (req, res) => {
  const { name, values = [] } = req.body
  if (!name) return res.status(400).json({ success: false, message: 'Name required' })
  const attribute = await db.variationAttribute.create({
    data: {
      name,
      values: { create: values.map(v => ({ value: v.value, colorCode: v.colorCode || null })) }
    },
    include: { values: true }
  })
  res.status(201).json({ success: true, data: { attribute } })
})

// PUT update attribute name
router.put('/:id', protect, async (req, res) => {
  const { name } = req.body
  const attribute = await db.variationAttribute.update({
    where: { id: Number(req.params.id) },
    data: { name },
    include: { values: true }
  })
  res.json({ success: true, data: { attribute } })
})

// DELETE attribute
router.delete('/:id', protect, async (req, res) => {
  await db.variationAttribute.delete({ where: { id: Number(req.params.id) } })
  res.json({ success: true })
})

// POST add value to attribute
router.post('/:id/values', protect, async (req, res) => {
  const { value, colorCode } = req.body
  if (!value) return res.status(400).json({ success: false, message: 'Value required' })
  const val = await db.variationAttributeValue.create({
    data: { attributeId: Number(req.params.id), value, colorCode: colorCode || null }
  })
  res.status(201).json({ success: true, data: { value: val } })
})

// DELETE value
router.delete('/:id/values/:valueId', protect, async (req, res) => {
  await db.variationAttributeValue.delete({ where: { id: Number(req.params.valueId) } })
  res.json({ success: true })
})

export default router
