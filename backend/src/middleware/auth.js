import jwt from 'jsonwebtoken'
import { db } from '../config/prisma.js'

export const protect = async (req, res, next) => {
  let token = req.cookies?.token
  if (!token) {
    const auth = req.headers.authorization
    if (auth?.startsWith('Bearer ')) token = auth.slice(7)
  }
  if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await db.adminUser.findUnique({ where: { id: decoded.id } })
    if (!user) return res.status(401).json({ success: false, message: 'User not found' })
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(403).json({ success: false, message: 'Account temporarily locked' })
    }
    req.adminUser = user
    next()
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' })
  }
}

export const adminOnly = (req, res, next) => {
  if (req.adminUser?.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' })
  next()
}
