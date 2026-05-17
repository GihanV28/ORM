import express from 'express'
import { protect } from '../middleware/auth.js'
import { db } from '../config/prisma.js'

const router = express.Router()

// Campaigns
router.get('/campaigns', protect, async (req, res) => {
  const { page = 1, limit = 25 } = req.query
  const skip = (Number(page) - 1) * Number(limit)
  const [campaigns, total] = await Promise.all([
    db.smsCampaign.findMany({ orderBy: { createdAt: 'desc' }, take: Number(limit), skip }),
    db.smsCampaign.count(),
  ])
  const stats = await db.smsCampaign.aggregate({ _sum: { sent: true, recipients: true }, _count: { _all: true } })
  res.json({ success: true, data: { campaigns, stats, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } } })
})

router.post('/campaigns', protect, async (req, res) => {
  const { name, message } = req.body
  if (!name || !message) return res.status(400).json({ success: false, message: 'Name and message required' })
  const campaign = await db.smsCampaign.create({ data: { name, message } })
  res.status(201).json({ success: true, data: { campaign } })
})

router.delete('/campaigns/:id', protect, async (req, res) => {
  await db.smsCampaign.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

// Contacts
router.get('/contacts', protect, async (req, res) => {
  const { search, group, page = 1, limit = 50 } = req.query
  const where = {}
  if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search, mode: 'insensitive' } }]
  if (group) where.group = group
  const skip = (Number(page) - 1) * Number(limit)
  const [contacts, total] = await Promise.all([
    db.smsContact.findMany({ where, orderBy: { name: 'asc' }, take: Number(limit), skip }),
    db.smsContact.count({ where }),
  ])
  res.json({ success: true, data: { contacts, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } } })
})

router.post('/contacts', protect, async (req, res) => {
  const { name, phone, group } = req.body
  if (!name || !phone) return res.status(400).json({ success: false, message: 'Name and phone required' })
  const contact = await db.smsContact.create({ data: { name, phone, group: group || null } })
  res.status(201).json({ success: true, data: { contact } })
})

router.put('/contacts/:id', protect, async (req, res) => {
  const { name, phone, group } = req.body
  const contact = await db.smsContact.update({ where: { id: req.params.id }, data: { name, phone, group: group || null } })
  res.json({ success: true, data: { contact } })
})

router.delete('/contacts/:id', protect, async (req, res) => {
  await db.smsContact.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

export default router
