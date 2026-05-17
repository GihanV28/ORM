import express from 'express'
import { protect } from '../middleware/auth.js'
import { db } from '../config/prisma.js'

const router = express.Router()

const getDateWhere = (from, to) => {
  const fromDate = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const toDate = to ? new Date(to + 'T23:59:59') : new Date()
  return { gte: fromDate, lte: toDate }
}

// Main summary report
router.get('/', protect, async (req, res) => {
  const { from, to } = req.query
  const createdAt = getDateWhere(from, to)
  const where = { createdAt, isPos: false }

  const [agg, statusBreakdown, topProductsRaw] = await Promise.all([
    db.order.aggregate({ where, _count: { _all: true }, _sum: { total: true, profit: true }, _avg: { total: true } }),
    db.order.groupBy({ by: ['status'], where, _count: { _all: true }, _sum: { total: true } }),
    db.order.findMany({ where, select: { items: true } }),
  ])

  const productMap = {}
  for (const order of topProductsRaw) {
    const items = Array.isArray(order.items) ? order.items : []
    for (const item of items) {
      const key = item.sku || item.productName
      if (!productMap[key]) productMap[key] = { productName: item.productName, sku: item.sku, totalQuantity: 0, totalRevenue: 0 }
      productMap[key].totalQuantity += item.quantity || 0
      productMap[key].totalRevenue += (item.unitPrice || 0) * (item.quantity || 0)
    }
  }
  const topProducts = Object.values(productMap).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10)

  res.json({
    success: true,
    data: {
      summary: {
        totalOrders: agg._count._all, totalRevenue: agg._sum.total || 0,
        totalProfit: agg._sum.profit || 0, avgOrderValue: agg._avg.total || 0,
      },
      statusBreakdown: statusBreakdown.map(s => ({ _id: s.status, count: s._count._all, revenue: s._sum.total || 0 })),
      topProducts,
    }
  })
})

// Profit analytics
router.get('/profits', protect, async (req, res) => {
  const { from, to } = req.query
  const createdAt = getDateWhere(from, to)
  const where = { createdAt }

  const [agg, dailyProfit, topProductsRaw, expenseAgg] = await Promise.all([
    db.order.aggregate({ where, _sum: { total: true, profit: true }, _count: { _all: true } }),
    db.order.groupBy({
      by: [],
      where,
      _sum: { total: true, profit: true },
    }),
    db.order.findMany({ where, select: { items: true } }),
    db.expense.aggregate({ where: { date: getDateWhere(from, to) }, _sum: { amount: true } }),
  ])

  const productMap = {}
  for (const order of topProductsRaw) {
    const items = Array.isArray(order.items) ? order.items : []
    for (const item of items) {
      const key = item.sku || item.productName
      if (!productMap[key]) productMap[key] = { productName: item.productName, sku: item.sku, qty: 0, revenue: 0, cost: 0, profit: 0 }
      productMap[key].qty += item.quantity || 0
      productMap[key].revenue += (item.unitPrice || 0) * (item.quantity || 0)
      productMap[key].cost += (item.unitCost || 0) * (item.quantity || 0)
      productMap[key].profit += ((item.unitPrice || 0) - (item.unitCost || 0)) * (item.quantity || 0)
    }
  }
  const topProducts = Object.values(productMap).sort((a, b) => b.profit - a.profit).slice(0, 10)
  const totalExpenses = expenseAgg._sum.amount || 0

  res.json({
    success: true,
    data: {
      summary: {
        totalRevenue: agg._sum.total || 0,
        grossProfit: agg._sum.profit || 0,
        totalExpenses,
        netProfit: (agg._sum.profit || 0) - totalExpenses,
        profitMargin: agg._sum.total ? (((agg._sum.profit || 0) / agg._sum.total) * 100).toFixed(1) : '0',
        totalOrders: agg._count._all,
      },
      topProducts,
    }
  })
})

// Product analytics
router.get('/products', protect, async (req, res) => {
  const { from, to } = req.query
  const createdAt = getDateWhere(from, to)
  const where = { createdAt }

  const ordersRaw = await db.order.findMany({ where, select: { items: true } })

  const productMap = {}
  for (const order of ordersRaw) {
    const items = Array.isArray(order.items) ? order.items : []
    for (const item of items) {
      const key = item.sku || item.productName
      if (!productMap[key]) productMap[key] = { productName: item.productName, sku: item.sku, qty: 0, revenue: 0, profit: 0 }
      productMap[key].qty += item.quantity || 0
      productMap[key].revenue += (item.unitPrice || 0) * (item.quantity || 0)
      productMap[key].profit += ((item.unitPrice || 0) - (item.unitCost || 0)) * (item.quantity || 0)
    }
  }
  const byRevenue = Object.values(productMap).sort((a, b) => b.revenue - a.revenue)
  const byUnits = Object.values(productMap).sort((a, b) => b.qty - a.qty)

  const [totalProducts, lowStock, outOfStock] = await Promise.all([
    db.product.count(),
    db.stock.count({ where: { quantity: { lte: 5, gt: 0 } } }),
    db.stock.count({ where: { quantity: { lte: 0 } } }),
  ])

  res.json({
    success: true,
    data: { byRevenue: byRevenue.slice(0, 10), byUnits: byUnits.slice(0, 10), stockStats: { totalProducts, lowStock, outOfStock } }
  })
})

// Customer analytics
router.get('/customers', protect, async (req, res) => {
  const { from, to } = req.query
  const createdAt = getDateWhere(from, to)

  const [topBySpend, totalCustomers, newCustomers] = await Promise.all([
    db.customer.findMany({ orderBy: { totalSpent: 'desc' }, take: 10, select: { id: true, name: true, phone: true, totalOrders: true, totalSpent: true, creditBalance: true, createdAt: true } }),
    db.customer.count(),
    db.customer.count({ where: { createdAt } }),
  ])

  const repeatCustomers = await db.customer.count({ where: { totalOrders: { gte: 2 } } })

  res.json({
    success: true,
    data: {
      topBySpend,
      stats: { totalCustomers, newCustomers, repeatCustomers, repeatRate: totalCustomers > 0 ? ((repeatCustomers / totalCustomers) * 100).toFixed(1) : '0' }
    }
  })
})

// Geographic report
router.get('/geographic', protect, async (req, res) => {
  const { from, to } = req.query
  const createdAt = getDateWhere(from, to)
  const where = { createdAt }

  const [byDistrict, byCity] = await Promise.all([
    db.order.groupBy({ by: ['district'], where, _count: { _all: true }, _sum: { total: true }, orderBy: { _sum: { total: 'desc' } } }),
    db.order.groupBy({ by: ['city'], where, _count: { _all: true }, _sum: { total: true }, orderBy: { _sum: { total: 'desc' } }, take: 10 }),
  ])

  res.json({
    success: true,
    data: {
      byDistrict: byDistrict.map(r => ({ district: r.district, orders: r._count._all, revenue: r._sum.total || 0 })),
      byCity: byCity.map(r => ({ city: r.city, orders: r._count._all, revenue: r._sum.total || 0 })),
    }
  })
})

// Employee performance
router.get('/employee-performance', protect, async (req, res) => {
  const { from, to } = req.query
  const createdAt = getDateWhere(from, to)
  const where = { createdAt, assignedEmployeeId: { not: null } }

  const byEmployee = await db.order.groupBy({
    by: ['assignedEmployeeId'],
    where,
    _count: { _all: true },
    _sum: { total: true, profit: true },
  })

  const result = await Promise.all(byEmployee.map(async (row) => {
    const employee = await db.employee.findUnique({ where: { id: row.assignedEmployeeId }, select: { id: true, name: true, role: true } })
    const returnedOrders = await db.order.count({ where: { assignedEmployeeId: row.assignedEmployeeId, status: { in: ['returned', 'refunded'] }, createdAt } })
    return {
      employee,
      totalOrders: row._count._all,
      revenue: row._sum.total || 0,
      profit: row._sum.profit || 0,
      returned: returnedOrders,
      successRate: row._count._all > 0 ? (((row._count._all - returnedOrders) / row._count._all) * 100).toFixed(1) : '0',
    }
  }))

  res.json({ success: true, data: { employees: result } })
})

// Customer outstanding (unpaid/partial/COD pending)
router.get('/outstanding/customers', protect, async (req, res) => {
  const [unpaid, creditCustomers] = await Promise.all([
    db.order.findMany({
      where: { paymentStatus: { in: ['pending', 'partially_paid'] }, paymentMethod: { not: 'cod' } },
      orderBy: { createdAt: 'desc' }, take: 50,
      select: { id: true, orderNumber: true, customerName: true, customerPhone: true, total: true, paymentStatus: true, paymentMethod: true, createdAt: true }
    }),
    db.customer.findMany({
      where: { creditBalance: { gt: 0 } },
      orderBy: { creditBalance: 'desc' }, take: 50,
      select: { id: true, name: true, phone: true, creditBalance: true, totalOrders: true }
    }),
  ])

  const totalUnpaid = unpaid.reduce((s, o) => s + o.total, 0)
  const totalCredit = creditCustomers.reduce((s, c) => s + c.creditBalance, 0)

  res.json({ success: true, data: { unpaid, creditCustomers, totalUnpaid, totalCredit } })
})

// Supplier outstanding
router.get('/outstanding/suppliers', protect, async (req, res) => {
  const suppliers = await db.supplier.findMany({
    where: { totalOwed: { gt: 0 } },
    orderBy: { totalOwed: 'desc' },
    select: { id: true, name: true, phone: true, totalOwed: true, totalPaid: true }
  })
  const outstanding = suppliers.map(s => ({ ...s, balance: s.totalOwed - s.totalPaid })).filter(s => s.balance > 0)
  res.json({ success: true, data: { suppliers: outstanding, total: outstanding.reduce((s, sup) => s + sup.balance, 0) } })
})

// COGS (Cost of Goods Sold)
router.get('/cogs', protect, async (req, res) => {
  const { from, to } = req.query
  const createdAt = getDateWhere(from, to)
  const ordersRaw = await db.order.findMany({ where: { createdAt }, select: { items: true } })

  const productMap = {}
  for (const order of ordersRaw) {
    const items = Array.isArray(order.items) ? order.items : []
    for (const item of items) {
      const key = item.sku || item.productName
      if (!productMap[key]) productMap[key] = { productName: item.productName, sku: item.sku, qty: 0, revenue: 0, cost: 0, profit: 0 }
      productMap[key].qty += item.quantity || 0
      productMap[key].revenue += (item.unitPrice || 0) * (item.quantity || 0)
      productMap[key].cost += (item.unitCost || 0) * (item.quantity || 0)
      productMap[key].profit = productMap[key].revenue - productMap[key].cost
    }
  }

  const rows = Object.values(productMap).sort((a, b) => b.revenue - a.revenue)
  const totals = rows.reduce((acc, r) => ({ revenue: acc.revenue + r.revenue, cost: acc.cost + r.cost, profit: acc.profit + r.profit, qty: acc.qty + r.qty }), { revenue: 0, cost: 0, profit: 0, qty: 0 })

  res.json({ success: true, data: { rows, totals } })
})

export default router
