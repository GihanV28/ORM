import express from 'express'
import { protect } from '../middleware/auth.js'
import { db } from '../config/prisma.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  const { search, limit = 50 } = req.query
  const where = search ? { name: { contains: search, mode: 'insensitive' } } : {}
  const suppliers = await db.supplier.findMany({ where, orderBy: { name: 'asc' }, take: Number(limit) })
  res.json({ success: true, data: { suppliers } })
})

router.post('/', protect, async (req, res) => {
  const { name, contactPerson, phone, email, address, notes } = req.body
  if (!name) return res.status(400).json({ success: false, message: 'Supplier name required' })
  const supplier = await db.supplier.create({ data: { name, contactPerson, phone, email, address, notes } })
  res.status(201).json({ success: true, data: { supplier } })
})

router.put('/:id', protect, async (req, res) => {
  const { name, contactPerson, phone, email, address, city, district, bankAccount, bankName, notes, status } = req.body
  const supplier = await db.supplier.update({
    where: { id: req.params.id },
    data: { name, contactPerson, phone, email, address, city, district, bankAccount, bankName, notes, status }
  })
  res.json({ success: true, data: { supplier } })
})

router.delete('/:id', protect, async (req, res) => {
  await db.supplier.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

export default router
