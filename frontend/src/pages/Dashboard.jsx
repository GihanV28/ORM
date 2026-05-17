import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { formatCurrency, formatDate } from '../lib/utils'
import Spinner from '../components/ui/Spinner'
import Badge from '../components/ui/Badge'
import StatCard from '../components/ui/StatCard'
import { ShoppingCart, Package, Users, DollarSign, TrendingUp, AlertTriangle, Plus, BarChart2, Calendar } from 'lucide-react'

const today = new Date()
const fmt = (d) => d.toISOString().split('T')[0]

const DATE_PRESETS = [
  { label: 'Today', from: fmt(today), to: fmt(today) },
  { label: 'Yesterday', from: fmt(new Date(today - 86400000)), to: fmt(new Date(today - 86400000)) },
  { label: 'This Week', from: fmt(new Date(today - today.getDay() * 86400000)), to: fmt(today) },
  { label: 'This Month', from: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), to: fmt(today) },
  { label: 'Last 30 Days', from: fmt(new Date(today - 30 * 86400000)), to: fmt(today) },
]

export default function Dashboard() {
  const [preset, setPreset] = useState('This Month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const activeDates = showCustom && customFrom && customTo
    ? { from: customFrom, to: customTo }
    : DATE_PRESETS.find(p => p.label === preset) || DATE_PRESETS[3]

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', activeDates],
    queryFn: () => api.get('/dashboard', { params: activeDates }).then(r => r.data.data),
  })

  const s = data?.stats || {}
  const recentOrders = data?.recentOrders || []
  const lowStockItems = data?.lowStock || []

  const handlePreset = (p) => { setPreset(p.label); setShowCustom(false) }

  return (
    <div className="p-6 space-y-6">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-primary-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl shadow-primary-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center"><BarChart2 size={18} /></span>
              Dashboard
            </h1>
            <p className="text-primary-100 text-sm mt-1">Overview for <strong>{showCustom && customFrom ? `${customFrom} → ${customTo}` : preset}</strong></p>
          </div>
          <Link to="/orders/new" className="flex items-center gap-2 px-4 py-2.5 bg-white text-primary-700 rounded-xl text-sm font-semibold hover:bg-primary-50 transition-colors shadow-sm shrink-0">
            <Plus size={16} /> New Order
          </Link>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar size={15} className="text-gray-400 shrink-0" />
          {DATE_PRESETS.map(p => (
            <button key={p.label} onClick={() => handlePreset(p)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                preset === p.label && !showCustom
                  ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/30'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {p.label}
            </button>
          ))}
          <button onClick={() => setShowCustom(s => !s)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${showCustom ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            Custom
          </button>
          {showCustom && (
            <div className="flex items-center gap-2 ml-1">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50" />
              <span className="text-gray-400 text-sm">to</span>
              <input type="date" value={customTo} min={customFrom} onChange={e => setCustomTo(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50" />
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={ShoppingCart} label="Total Orders" value={s.totalOrders ?? 0} color="primary" sub={`${s.todayOrders ?? 0} today`} />
            <StatCard icon={DollarSign} label="Revenue" value={formatCurrency(s.monthRevenue ?? 0)} color="green" sub="period total" />
            <StatCard icon={TrendingUp} label="Today Revenue" value={formatCurrency(s.todayRevenue ?? 0)} color="emerald" />
            <StatCard icon={Package} label="Pending Orders" value={s.pendingOrders ?? 0} color="amber" />
            <StatCard icon={ShoppingCart} label="Month Orders" value={s.monthOrders ?? 0} color="blue" />
            <StatCard icon={Users} label="Customers" value={s.totalCustomers ?? 0} color="purple" />
            <StatCard icon={Package} label="Products" value={s.totalProducts ?? 0} color="primary" />
            <StatCard icon={AlertTriangle} label="Low Stock" value={s.lowStockCount ?? 0} color="red" />
          </div>

          {/* Recent Orders + Low Stock */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Orders */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Recent Orders</h2>
                <Link to="/orders" className="text-sm text-primary-600 hover:underline font-medium">View all →</Link>
              </div>
              {recentOrders.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-sm">No orders in this period</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Order</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentOrders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3">
                          <Link to={`/orders/${order.id}`} className="font-mono text-xs font-semibold text-primary-700 hover:underline">
                            {order.orderNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-gray-700">{order.customerName}</td>
                        <td className="px-6 py-3 text-right font-semibold text-gray-900">{formatCurrency(order.total)}</td>
                        <td className="px-6 py-3"><Badge status={order.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Low Stock Alert */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <AlertTriangle size={15} className="text-amber-500" /> Low Stock
                </h2>
                <Link to="/stock/alerts" className="text-sm text-primary-600 hover:underline font-medium">View all →</Link>
              </div>
              {lowStockItems.length === 0 ? (
                <div className="text-center py-8">
                  <Package size={28} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">All stock levels healthy</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {lowStockItems.map(item => (
                    <li key={item.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.product?.name}</p>
                        <p className="text-xs text-gray-400">{item.product?.itemCode}</p>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold text-base ${item.quantity <= 0 ? 'text-red-600' : 'text-amber-600'}`}>{item.quantity}</span>
                        <p className="text-xs text-gray-400">min {item.product?.minStock || 5}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
