import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { formatCurrency, formatDate } from '../lib/utils'
import DataTable from '../components/ui/DataTable'
import Badge from '../components/ui/Badge'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'

export default function PurchaseOrders() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', page],
    queryFn: () => api.get('/purchase-orders', { params: { page, limit: 25 } }).then(r => r.data.data),
  })

  const orders = data?.purchaseOrders || []
  const pagination = data?.pagination || {}

  const columns = [
    { key: 'poNumber', label: 'PO #', render: row => <span className="font-mono text-xs text-blue-700">{row.poNumber}</span> },
    { key: 'supplier', label: 'Supplier', render: row => row.supplier?.name || '—' },
    { key: 'status', label: 'Status', render: row => <Badge status={row.status} /> },
    { key: 'totalAmount', label: 'Total', render: row => formatCurrency(row.totalAmount) },
    { key: 'orderDate', label: 'Order Date', render: row => formatDate(row.orderDate) },
    { key: 'expectedDate', label: 'Expected', render: row => formatDate(row.expectedDate) },
  ]

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
      </div>
      <DataTable columns={columns} data={orders} loading={isLoading} emptyMessage="No purchase orders found." />
      {pagination.pages > 1 && (
        <div className="flex gap-2 justify-end">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40 text-sm">Prev</button>
          <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40 text-sm">Next</button>
        </div>
      )}
    </div>
  )
}
