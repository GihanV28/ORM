import express from 'express'
import { protect } from '../middleware/auth.js'
import { db } from '../config/prisma.js'

const router = express.Router()

router.get('/summary', protect, async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const [todayCash, monthCash, codPending, expenses] = await Promise.all([
    db.order.aggregate({ where: { paymentStatus: 'paid', paymentMethod: 'cash', createdAt: { gte: today } }, _sum: { total: true } }),
    db.order.aggregate({ where: { paymentStatus: 'paid', paymentMethod: 'cash', createdAt: { gte: thisMonth } }, _sum: { total: true } }),
    db.order.aggregate({ where: { paymentMethod: 'cod', paymentStatus: 'pending' }, _sum: { total: true } }),
    db.expense.aggregate({ where: { date: { gte: thisMonth } }, _sum: { amount: true } }),
  ])

  res.json({
    success: true,
    data: {
      todayCash: todayCash._sum.total || 0,
      monthCash: monthCash._sum.total || 0,
      codPending: codPending._sum.total || 0,
      monthExpenses: expenses._sum.amount || 0,
    }
  })
})

export default router
