import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { formatCurrency, formatDate, ORDER_STATUSES } from '../../lib/utils'
import Badge from '../../components/ui/Badge'
import DataTable from '../../components/ui/DataTable'
import { Plus, Search, Filter, RefreshCw } from 'lucide-react'

export default function OrderList() {
  const qc = useQueryClient()
  const [filters, setFilters] = useState({ status: '', search: '', page: 1 })

  const { data, isLoading } = useQuery({
    queryKey: ['orders', filters],
    queryFn: () => api.get('/orders', { params: { ...filters, limit: 25 } }).then(r => r.data.data),
  })

  const orders = data?.orders || []
  const pagination = data?.pagination || {}

  const columns = [
    {
      key: 'orderNumber', label: 'Order #',
      render: row => <Link to={`/orders/${row._id}`} className="font-mono text-xs text-blue-700 hover:underline">{row.orderNumber}</Link>
    },
    { key: 'customerName', label: 'Customer' },
    { key: 'customerPhone', label: 'Phone' },
    { key: 'city', label: 'City' },
    { key: 'totalAmount', label: 'Amount', render: row => formatCurrency(row.totalAmount) },
    { key: 'paymentMethod', label: 'Payment', render: row => <Badge status={row.paymentStatus} label={row.paymentMethod?.toUpperCase()} /> },
    { key: 'status', label: 'Status', render: row => <Badge status={row.status} /> },
    { key: 'createdAt', label: 'Date', render: row => formatDate(row.createdAt) },
    {
      key: 'actions', label: '',
      render: row => (
        <Link to={`/orders/${row._id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">View</Link>
      )
    },
  ]

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <Link to="/orders/new" className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors">
          <Plus size={16} /> New Order
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search size={16} className="text-gray-400" />
          <input
            placeholder="Search customer, phone, order #..."
            className="text-sm outline-none flex-1"
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
          />
        </div>
        <select
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
        >
          <option value="">All Statuses</option>
          {ORDER_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <button onClick={() => qc.invalidateQueries(['orders'])} className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
          <RefreshCw size={15} />
        </button>
      </div>

      <DataTable columns={columns} data={orders} loading={isLoading} emptyMessage="No orders found." />

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Page {pagination.page} of {pagination.pages} ({pagination.total} orders)</span>
          <div className="flex gap-2">
            <button
              disabled={filters.page <= 1}
              onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >Prev</button>
            <button
              disabled={filters.page >= pagination.pages}
              onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
