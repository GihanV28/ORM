import express from 'express'
import { db } from '../config/prisma.js'
import { FARDAR_STATUS_MAP } from '../services/fardar.js'

const router = express.Router()

// POST /api/webhooks/fardar
// Fardar Express pushes delivery status updates here (form data, not JSON)
router.post('/fardar', express.urlencoded({ extended: false }), async (req, res) => {
  const { waybill_id, delivery_status, last_update_time } = req.body

  if (!waybill_id) return res.status(400).send('Missing waybill_id')

  const order = await db.order.findFirst({ where: { waybillNumber: String(waybill_id) } })
  if (!order) {
    // Not found but return 200 so Fardar doesn't keep retrying
    console.warn(`[Fardar webhook] No order found for waybill: ${waybill_id}`)
    return res.status(200).send('OK')
  }

  const history = Array.isArray(order.trackingHistory) ? order.trackingHistory : []
  history.push({
    status: delivery_status,
    timestamp: last_update_time ? new Date(last_update_time) : new Date(),
    note: `Fardar update: ${delivery_status}`,
  })

  // Map Fardar status to ORM status if we have a mapping
  const ormStatus = FARDAR_STATUS_MAP[delivery_status]

  await db.order.update({
    where: { id: order.id },
    data: {
      trackingHistory: history,
      ...(ormStatus ? { status: ormStatus } : {}),
    }
  })

  console.log(`[Fardar webhook] Order ${order.orderNumber} → status: ${delivery_status}${ormStatus ? ` (→ ${ormStatus})` : ''}`)
  res.status(200).send('OK')
})

export default router
