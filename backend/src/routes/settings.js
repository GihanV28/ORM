import express from 'express'
import { protect } from '../middleware/auth.js'
import { db } from '../config/prisma.js'
import crypto from 'crypto'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  const { passwordHash, sessions, ...user } = req.adminUser
  res.json({ success: true, data: { user } })
})

router.put('/', protect, async (req, res) => {
  const { name, businessName, phone, address, settings } = req.body
  const updated = await db.adminUser.update({
    where: { id: req.adminUser.id },
    data: { name, businessName, phone, address, settings }
  })
  const { passwordHash, sessions, ...safe } = updated
  res.json({ success: true, data: { user: safe } })
})

router.post('/regenerate-api-key', protect, async (req, res) => {
  const apiKey = crypto.randomBytes(24).toString('hex')
  await db.adminUser.update({ where: { id: req.adminUser.id }, data: { apiKey } })
  res.json({ success: true, data: { apiKey } })
})

export default router
