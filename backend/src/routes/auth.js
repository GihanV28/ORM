import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { db } from '../config/prisma.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })
const cookieOpts = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 }
const safeUser = ({ passwordHash, sessions, ...u }) => u

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' })

  const user = await db.adminUser.findUnique({ where: { email: email.toLowerCase() } })
  if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' })

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return res.status(403).json({ success: false, message: 'Account locked. Try again later.' })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    const attempts = (user.failedAttempts || 0) + 1
    await db.adminUser.update({
      where: { id: user.id },
      data: attempts >= 5
        ? { failedAttempts: attempts, lockedUntil: new Date(Date.now() + 30 * 60 * 1000) }
        : { failedAttempts: attempts }
    })
    return res.status(401).json({ success: false, message: 'Invalid credentials' })
  }

  await db.adminUser.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedUntil: null, lastLogin: new Date() } })

  const token = signToken(user.id)
  res.cookie('token', token, cookieOpts)
  res.json({ success: true, data: { user: safeUser(user), token } })
})

router.post('/logout', (req, res) => {
  res.clearCookie('token')
  res.json({ success: true })
})

router.get('/me', protect, (req, res) => {
  res.json({ success: true, data: { user: safeUser(req.adminUser) } })
})

router.post('/change-password', protect, async (req, res) => {
  const { currentPassword, newPassword } = req.body
  const user = await db.adminUser.findUnique({ where: { id: req.adminUser.id } })
  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) return res.status(400).json({ success: false, message: 'Current password incorrect' })
  const passwordHash = await bcrypt.hash(newPassword, 12)
  await db.adminUser.update({ where: { id: user.id }, data: { passwordHash } })
  res.json({ success: true, message: 'Password updated' })
})

export default router
