import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { formatDateTime } from '../../lib/utils'
import PageHeader from '../../components/ui/PageHeader'
import DataTable from '../../components/ui/DataTable'
import { History, Download } from 'lucide-react'

const MOVEMENT_TYPES = ['in','out','adjust','return','grn_received','order_confirmed','order_cancelled','pos_sale','manual_add']
const MOVEMENT_COLORS = {
  in: 'bg-green-100 text-green-700', out: 'bg-red-100 text-red-700',
  adjust: 'bg-blue-100 text-blue-700', return: 'bg-purple-100 text-purple-700',
  grn_received: 'bg-emerald-100 text-emerald-700', order_confirmed: 'bg-red-100 text-red-700',
  order_cancelled: 'bg-green-100 text-green-700', pos_sale: 'bg-orange-100 text-orange-700',
  manual_add: 'bg-blue-100 text-blue-700',
}
const POSITIVE_TYPES = ['in','return','grn_received','order_cancelled','manual_add']

const today = new Date()
const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
const defaultTo = today.toISOString().split('T')[0]

export default function StockHistory() {
  const [filters, setFilters] = useState({ type: '', from: defaultFrom, to: defaultTo, page: 1 })
  const f = (k, v) => setFilters(p => ({ ...p, [k]: v, page: 1 }))

  const { data, isLoading } = useQuery({
    queryKey: ['stock-history', filters],
    queryFn: () => api.get('/stock/history', { params: filters }).then(r => r.data.data),
  })

  const movements = data?.movements || []
  const pagination = data?.pagination || {}

  const handleExport = async () => {
    const res = await api.get('/stock/export', { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url; a.download = 'stock-export.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const columns = [
    { key: 'createdAt', label: 'Date / Time', render: r => <span className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(r.createdAt)}</span> },
    { key: 'product', label: 'Product', render: r => (
      <div>
        <p className="font-medium text-gray-900">{r.product?.name}</p>
        <p className="text-xs text-gray-400">{r.product?.itemCode}</p>
      </div>
    )},
    { key: 'type', label: 'Movement', render: r => (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${MOVEMENT_COLORS[r.type] || 'bg-gray-100 text-gray-600'}`}>
        {r.type?.replace(/_/g, ' ')}
      </span>
    )},
    { key: 'quantity', label: 'Change', render: r => {
      const positive = POSITIVE_TYPES.includes(r.type)
      return <span className={`font-bold text-base ${positive ? 'text-green-600' : 'text-red-600'}`}>{positive ? '+' : '-'}{r.quantity}</span>
    }},
    { key: 'reference', label: 'Reference', render: r => r.reference ? <span className="font-mono text-xs text-primary-700">{r.reference}</span> : '—' },
    { key: 'note', label: 'Note', render: r => <span className="text-gray-500 text-xs">{r.note || '—'}</span> },
  ]

  return (
    <div className="p-6 space-y-5">
      <PageHeader icon={History} title="Stock History" subtitle="Complete log of all stock movements"
        gradient="from-slate-600 to-gray-700"
        actions={
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-semibold transition-colors">
            <Download size={15} /> Export CSV
          </button>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Movement Type</label>
          <select value={filters.type} onChange={e => f('type', e.target.value)} className="form-select text-sm">
            <option value="">All Types</option>
            {MOVEMENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">From Date</label>
          <input type="date" value={filters.from} onChange={e => f('from', e.target.value)} className="form-input text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To Date</label>
          <input type="date" value={filters.to} onChange={e => f('to', e.target.value)} className="form-input text-sm" />
        </div>
      </div>

      <DataTable columns={columns} data={movements} loading={isLoading} emptyMessage="No stock movements for the selected filters." />

      {pagination.pages > 1 && (
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>{pagination.total} movements</span>
          <div className="flex gap-2">
            <button disabled={filters.page <= 1} onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))} className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">Prev</button>
            <span className="px-3 py-1.5 text-gray-500">Page {filters.page} of {pagination.pages}</span>
            <button disabled={filters.page >= pagination.pages} onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))} className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
