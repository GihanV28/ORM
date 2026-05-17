import express from 'express'
import { protect } from '../middleware/auth.js'
import { db } from '../config/prisma.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  const { search, page = 1, limit = 25 } = req.query
  const where = {}
  if (search) where.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    { phone: { contains: search, mode: 'insensitive' } },
    { email: { contains: search, mode: 'insensitive' } },
  ]
  const skip = (Number(page) - 1) * Number(limit)
  const [customers, total] = await Promise.all([
    db.customer.findMany({ where, orderBy: { createdAt: 'desc' }, take: Number(limit), skip }),
    db.customer.count({ where }),
  ])
  res.json({ success: true, data: { customers, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } } })
})

router.get('/:id', protect, async (req, res) => {
  const customer = await db.customer.findUnique({
    where: { id: req.params.id },
    include: { orders: { orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, orderNumber: true, total: true, status: true, createdAt: true } } }
  })
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' })
  res.json({ success: true, data: { customer } })
})

router.post('/', protect, async (req, res) => {
  const { name, phone, email, address, city, district, postalCode, notes } = req.body
  if (!name || !phone) return res.status(400).json({ success: false, message: 'Name and phone required' })
  const customer = await db.customer.create({ data: { name, phone, email, address, city, district, postalCode, notes } })
  res.status(201).json({ success: true, data: { customer } })
})

router.put('/:id', protect, async (req, res) => {
  const { name, phone, email, address, city, district, postalCode, notes, status } = req.body
  const customer = await db.customer.update({
    where: { id: req.params.id },
    data: { name, phone, email, address, city, district, postalCode, notes, status }
  })
  res.json({ success: true, data: { customer } })
})

export default router
