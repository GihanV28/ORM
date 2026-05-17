import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import PageHeader from '../../components/ui/PageHeader'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import { Monitor, Plus } from 'lucide-react'

export default function PosSessions() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['pos-sessions', page],
    queryFn: () => api.get('/pos/sessions', { params: { page, limit: 25 } }).then(r => r.data.data),
  })

  const sessions = data?.sessions || []
  const pagination = data?.pagination || {}

  const columns = [
    { key: 'openedAt', label: 'Opened', render: r => <span className="text-sm">{formatDateTime(r.openedAt)}</span> },
    { key: 'closedAt', label: 'Closed', render: r => r.closedAt ? formatDateTime(r.closedAt) : <span className="text-green-600 font-medium text-sm">● Open</span> },
    { key: 'openingCash', label: 'Opening Cash', render: r => formatCurrency(r.openingCash) },
    { key: 'closingCash', label: 'Closing Cash', render: r => r.closingCash != null ? formatCurrency(r.closingCash) : '—' },
    { key: 'totalSales', label: 'Total Sales', render: r => <span className="font-bold text-primary-700">{formatCurrency(r.totalSales)}</span> },
    { key: 'totalOrders', label: 'Orders', render: r => <span className="font-semibold">{r.totalOrders}</span> },
    { key: 'status', label: 'Status', render: r => <Badge status={r.status} label={r.status === 'open' ? 'Open' : 'Closed'} /> },
    { key: 'balance', label: 'Balance', render: r => {
      if (!r.closingCash && r.closingCash !== 0) return '—'
      const expected = r.openingCash + r.totalSales
      const diff = r.closingCash - expected
      return <span className={`font-semibold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>{diff >= 0 ? '+' : ''}{formatCurrency(diff)}</span>
    }},
  ]

  return (
    <div className="p-6 space-y-5">
      <PageHeader icon={Monitor} title="POS Sessions" subtitle="Track point-of-sale session history and cash balances"
        gradient="from-teal-600 to-cyan-700"
        actions={
          <Link to="/pos" className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-semibold transition-colors">
            <Plus size={16} /> Open POS
          </Link>
        }
      />

      <DataTable columns={columns} data={sessions} loading={isLoading} emptyMessage="No POS sessions recorded yet." />

      {pagination.pages > 1 && (
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>{pagination.total} sessions</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">Prev</button>
            <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
