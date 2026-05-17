import express from 'express'
import { protect } from '../middleware/auth.js'
import { db } from '../config/prisma.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  const { supplierId, page = 1, limit = 25 } = req.query
  const where = supplierId ? { supplierId } : {}
  const skip = (Number(page) - 1) * Number(limit)
  const [payments, total] = await Promise.all([
    db.supplierPayment.findMany({
      where, orderBy: { date: 'desc' }, take: Number(limit), skip,
      include: { supplier: { select: { id: true, name: true } }, bankAccount: { select: { id: true, name: true, bankName: true } } }
    }),
    db.supplierPayment.count({ where }),
  ])

  // Calculate balances per supplier
  const balances = await db.supplierPayment.groupBy({
    by: ['supplierId'], _sum: { amount: true }
  })

  res.json({ success: true, data: { payments, balances, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } } })
})

router.get('/balances', protect, async (req, res) => {
  const suppliers = await db.supplier.findMany({ select: { id: true, name: true, totalOwed: true, totalPaid: true } })
  res.json({ success: true, data: { suppliers } })
})

router.post('/', protect, async (req, res) => {
  const { supplierId, amount, paymentMethod = 'cash', reference, bankAccountId, notes, date } = req.body
  if (!supplierId || !amount) return res.status(400).json({ success: false, message: 'Supplier and amount required' })

  const payment = await db.supplierPayment.create({
    data: {
      supplierId, amount: Number(amount), paymentMethod,
      reference, bankAccountId: bankAccountId || null, notes,
      date: date ? new Date(date) : new Date(),
    },
    include: { supplier: true }
  })

  await db.supplier.update({ where: { id: supplierId }, data: { totalPaid: { increment: Number(amount) } } })
  if (bankAccountId) await db.bankAccount.update({ where: { id: bankAccountId }, data: { balance: { decrement: Number(amount) } } })

  res.status(201).json({ success: true, data: { payment } })
})

export default router
