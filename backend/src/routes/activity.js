import express from 'express'
import { protect } from '../middleware/auth.js'
import { db } from '../config/prisma.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  const { page = 1, limit = 50, actorId, model } = req.query
  const where = {}
  if (actorId) where.actorId = actorId
  if (model) where.model = model

  const skip = (Number(page) - 1) * Number(limit)
  const [logs, total] = await Promise.all([
    db.activityLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: Number(limit), skip }),
    db.activityLog.count({ where }),
  ])
  res.json({ success: true, data: { logs, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } } })
})

// Internal helper — call this from other routes to log activity
export const logActivity = async ({ actorId, actorName, actorType = 'admin', action, model, recordId, changes, ip }) => {
  try {
    await db.activityLog.create({ data: { actorId, actorName, actorType, action, model, recordId, changes, ip } })
  } catch { /* non-critical, never throw */ }
}

export default router
