import express from 'express'
import { protect } from '../middleware/auth.js'
import { db } from '../config/prisma.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  const { from, to } = req.query
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  // Date range for filtered stats (from dashboard date picker)
  const rangeFrom = from ? new Date(from) : thisMonth
  const rangeTo = to ? new Date(to + 'T23:59:59') : new Date()

  const rangeWhere = { isPos: false, createdAt: { gte: rangeFrom, lte: rangeTo } }

  const [
    totalOrders, todayOrders, monthOrders,
    totalCustomers, totalProducts, pendingOrders,
    recentOrders,
  ] = await Promise.all([
    db.order.count({ where: rangeWhere }),
    db.order.count({ where: { isPos: false, createdAt: { gte: today } } }),
    db.order.count({ where: rangeWhere }),
    db.customer.count(),
    db.product.count(),
    db.order.count({ where: { status: { in: ['open', 'no_answer', 'on_hold', 'confirm'] } } }),
    db.order.findMany({
      where: rangeWhere,
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, orderNumber: true, customerName: true, total: true, status: true, createdAt: true }
    }),
  ])

  const [monthRevenueAgg, todayRevenueAgg] = await Promise.all([
    db.order.aggregate({ where: rangeWhere, _sum: { total: true } }),
    db.order.aggregate({ where: { isPos: false, createdAt: { gte: today } }, _sum: { total: true } }),
  ])

  const lowStockItems = await db.stock.findMany({
    where: { quantity: { lte: 5 } },
    include: { product: { select: { name: true, itemCode: true, minStock: true } } },
    take: 10,
  })

  const lowStock = lowStockItems.filter(s => s.product && s.quantity <= (s.product.minStock || 5))

  res.json({
    success: true,
    data: {
      stats: {
        totalOrders, todayOrders, monthOrders,
        monthRevenue: monthRevenueAgg._sum.total || 0,
        todayRevenue: todayRevenueAgg._sum.total || 0,
        totalCustomers, totalProducts, pendingOrders,
        lowStockCount: lowStock.length,
      },
      recentOrders,
      lowStock,
    }
  })
})

export default router
