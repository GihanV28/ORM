import express from 'express'
import { protect } from '../middleware/auth.js'
import { db } from '../config/prisma.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  const accounts = await db.bankAccount.findMany({ orderBy: { isDefault: 'desc' } })
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)
  res.json({ success: true, data: { accounts, totalBalance } })
})

router.post('/', protect, async (req, res) => {
  const { name, bankName, accountNo, branch, accountType = 'savings', isDefault = false, notes } = req.body
  if (!name || !bankName || !accountNo) return res.status(400).json({ success: false, message: 'Name, bank name and account number required' })
  if (isDefault) await db.bankAccount.updateMany({ data: { isDefault: false } })
  const account = await db.bankAccount.create({ data: { name, bankName, accountNo, branch, accountType, isDefault, notes } })
  res.status(201).json({ success: true, data: { account } })
})

router.put('/:id', protect, async (req, res) => {
  const { name, bankName, accountNo, branch, accountType, isDefault, notes } = req.body
  if (isDefault) await db.bankAccount.updateMany({ where: { id: { not: req.params.id } }, data: { isDefault: false } })
  const account = await db.bankAccount.update({ where: { id: req.params.id }, data: { name, bankName, accountNo, branch, accountType, isDefault, notes } })
  res.json({ success: true, data: { account } })
})

router.delete('/:id', protect, async (req, res) => {
  await db.bankAccount.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

export default router
