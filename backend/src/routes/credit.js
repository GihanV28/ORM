import express from 'express'
import { protect } from '../middleware/auth.js'
import { db } from '../config/prisma.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  const customers = await db.customer.findMany({
    where: { creditBalance: { gt: 0 } },
    orderBy: { creditBalance: 'desc' },
    select: { id: true, name: true, phone: true, creditBalance: true, totalOrders: true }
  })
  const totalOutstanding = customers.reduce((s, c) => s + c.creditBalance, 0)
  res.json({ success: true, data: { customers, totalOutstanding } })
})

router.get('/customer/:customerId', protect, async (req, res) => {
  const [customer, credits] = await Promise.all([
    db.customer.findUnique({ where: { id: req.params.customerId }, select: { id: true, name: true, phone: true, creditBalance: true } }),
    db.credit.findMany({ where: { customerId: req.params.customerId }, orderBy: { createdAt: 'desc' } })
  ])
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' })
  res.json({ success: true, data: { customer, credits } })
})

// Add credit (give goods on credit)
router.post('/add', protect, async (req, res) => {
  const { customerId, amount, orderId, notes } = req.body
  if (!customerId || !amount) return res.status(400).json({ success: false, message: 'Customer and amount required' })

  const customer = await db.customer.findUnique({ where: { id: customerId } })
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' })

  const newBalance = customer.creditBalance + Number(amount)
  await db.customer.update({ where: { id: customerId }, data: { creditBalance: newBalance } })

  const credit = await db.credit.create({
    data: { customerId, orderId: orderId || null, amount: Number(amount), type: 'credit', balanceAfter: newBalance, notes }
  })
  res.status(201).json({ success: true, data: { credit, newBalance } })
})

// Record payment against credit
router.post('/payment', protect, async (req, res) => {
  const { customerId, amount, notes } = req.body
  if (!customerId || !amount) return res.status(400).json({ success: false, message: 'Customer and amount required' })

  const customer = await db.customer.findUnique({ where: { id: customerId } })
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' })
  if (Number(amount) > customer.creditBalance) return res.status(400).json({ success: false, message: 'Payment exceeds outstanding balance' })

  const newBalance = customer.creditBalance - Number(amount)
  await db.customer.update({ where: { id: customerId }, data: { creditBalance: newBalance } })

  const credit = await db.credit.create({
    data: { customerId, amount: Number(amount), type: 'payment', balanceAfter: newBalance, notes }
  })
  res.status(201).json({ success: true, data: { credit, newBalance } })
})

export default router
