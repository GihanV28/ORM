import express from 'express'
import { protect } from '../middleware/auth.js'
import { db } from '../config/prisma.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  const { search, limit = 50 } = req.query
  const where = search ? { title: { contains: search, mode: 'insensitive' } } : {}

  const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const thisYear = new Date(new Date().getFullYear(), 0, 1)

  const [expenses, total, monthAgg, yearAgg] = await Promise.all([
    db.expense.findMany({ where, orderBy: { date: 'desc' }, take: Number(limit) }),
    db.expense.count({ where }),
    db.expense.aggregate({ where: { date: { gte: thisMonth } }, _sum: { amount: true } }),
    db.expense.aggregate({ where: { date: { gte: thisYear } }, _sum: { amount: true } }),
  ])

  res.json({
    success: true,
    data: {
      expenses, total,
      summary: { thisMonth: monthAgg._sum.amount || 0, thisYear: yearAgg._sum.amount || 0 }
    }
  })
})

router.post('/', protect, async (req, res) => {
  const { title, amount, category, date, paymentMethod = 'cash', reference, description } = req.body
  if (!title || !amount) return res.status(400).json({ success: false, message: 'Title and amount required' })
  const expense = await db.expense.create({
    data: { title, amount: Number(amount), category: category || 'Other', date: date ? new Date(date) : new Date(), paymentMethod, reference, description }
  })
  res.status(201).json({ success: true, data: { expense } })
})

router.delete('/:id', protect, async (req, res) => {
  await db.expense.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

export default router
