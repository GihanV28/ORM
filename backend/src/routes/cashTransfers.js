import express from 'express'
import { protect } from '../middleware/auth.js'
import { db } from '../config/prisma.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  const { page = 1, limit = 25 } = req.query
  const skip = (Number(page) - 1) * Number(limit)
  const [transfers, total] = await Promise.all([
    db.cashTransfer.findMany({
      orderBy: { date: 'desc' }, take: Number(limit), skip,
      include: { fromAccount: { select: { id: true, name: true, bankName: true } }, toAccount: { select: { id: true, name: true, bankName: true } } }
    }),
    db.cashTransfer.count(),
  ])
  res.json({ success: true, data: { transfers, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } } })
})

router.post('/', protect, async (req, res) => {
  const { type, fromAccountId, toAccountId, amount, reference, description, date } = req.body
  if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Valid amount required' })

  const transfer = await db.cashTransfer.create({
    data: {
      type: type || 'transfer',
      fromAccountId: fromAccountId || null,
      toAccountId: toAccountId || null,
      amount: Number(amount),
      reference, description,
      date: date ? new Date(date) : new Date(),
    }
  })

  // Update account balances
  if (fromAccountId) await db.bankAccount.update({ where: { id: fromAccountId }, data: { balance: { decrement: Number(amount) } } })
  if (toAccountId) await db.bankAccount.update({ where: { id: toAccountId }, data: { balance: { increment: Number(amount) } } })

  res.status(201).json({ success: true, data: { transfer } })
})

router.delete('/:id', protect, async (req, res) => {
  const t = await db.cashTransfer.findUnique({ where: { id: req.params.id } })
  if (!t) return res.status(404).json({ success: false, message: 'Transfer not found' })
  // Reverse balance effects
  if (t.fromAccountId) await db.bankAccount.update({ where: { id: t.fromAccountId }, data: { balance: { increment: t.amount } } })
  if (t.toAccountId) await db.bankAccount.update({ where: { id: t.toAccountId }, data: { balance: { decrement: t.amount } } })
  await db.cashTransfer.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

export default router
