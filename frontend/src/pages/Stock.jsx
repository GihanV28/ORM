import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { formatCurrency, formatDateTime } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import StatCard from '../components/ui/StatCard'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import { BarChart2, Search, SlidersHorizontal, History, X, AlertTriangle, Package, DollarSign } from 'lucide-react'

const MOVEMENT_COLORS = {
  in: 'bg-green-100 text-green-700',
  out: 'bg-red-100 text-red-700',
  adjust: 'bg-blue-100 text-blue-700',
  return: 'bg-purple-100 text-purple-700',
  grn_received: 'bg-emerald-100 text-emerald-700',
  order_confirmed: 'bg-red-100 text-red-700',
  order_cancelled: 'bg-green-100 text-green-700',
  manual_add: 'bg-blue-100 text-blue-700',
  pos_sale: 'bg-orange-100 text-orange-700',
}

export default function Stock() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [adjustModal, setAdjustModal] = useState(null)
  const [historyModal, setHistoryModal] = useState(null)
  const [adjustForm, setAdjustForm] = useState({ type: 'in', quantity: '', note: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['stock', search],
    queryFn: () => api.get('/stock', { params: { search, limit: 100 } }).then(r => r.data.data),
  })

  // Fetch movement history when history modal opens
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['stock-history', historyModal?.product?.id],
    queryFn: () => api.get(`/stock/${historyModal.product.id}`).then(r => r.data.data.stock),
    enabled: !!historyModal?.product?.id,
  })

  const stocks = data?.stock || []
  const summary = data?.summary || {}

  // Calculate stock value (quantity × costPrice)
  const totalStockValue = stocks.reduce((s, item) => {
    const costPrice = 0 // we'd need to include costPrice from product — covered below via include
    return s + item.quantity * (item.product?.costPrice || 0)
  }, 0)

  const adjustMutation = useMutation({
    mutationFn: ({ productId, body }) => api.post(`/stock/${productId}/adjust`, body),
    onSuccess: () => {
      qc.invalidateQueries(['stock'])
      setAdjustModal(null)
      toast.success('Stock adjusted successfully')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Adjustment failed')
  })

  const columns = [
    { key: 'product', label: 'Product', render: row => (
      <div>
        <p className="font-semibold text-gray-900">{row.product?.name}</p>
        <p className="text-xs text-gray-400">{row.product?.itemCode}</p>
      </div>
    )},
    { key: 'quantity', label: 'Stock', render: row => {
      const isLow = row.quantity <= (row.product?.minStock || 5) && row.quantity > 0
      const isOut = row.quantity <= 0
      return (
        <span className={`font-bold text-lg ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-900'}`}>
          {row.quantity}
          {isOut && <span className="ml-1.5 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">OUT</span>}
          {isLow && !isOut && <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">LOW</span>}
        </span>
      )
    }},
    { key: 'reserved', label: 'Reserved', render: row => <span className="text-gray-500">{row.reservedQuantity}</span> },
    { key: 'available', label: 'Available', render: row => <span className="font-semibold text-green-700">{row.quantity - row.reservedQuantity}</span> },
    { key: 'minStock', label: 'Min Stock', render: row => row.product?.minStock || 5 },
    { key: 'value', label: 'Stock Value', render: row => (
      <span className="text-gray-700">{row.product?.costPrice > 0 ? formatCurrency(row.quantity * row.product.costPrice) : '—'}</span>
    )},
    { key: 'actions', label: '', render: row => (
      <div className="flex gap-1.5">
        <button onClick={() => setHistoryModal(row)}
          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Movement History">
          <History size={14} />
        </button>
        <button onClick={() => { setAdjustModal(row); setAdjustForm({ type: 'in', quantity: '', note: '' }) }}
          className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 border border-primary-200 hover:bg-primary-50 px-2.5 py-1.5 rounded-lg transition-colors">
          <SlidersHorizontal size={12} /> Adjust
        </button>
      </div>
    )}
  ]

  return (
    <div className="p-6 space-y-5">
      <PageHeader icon={BarChart2} title="Stock Management" subtitle="Track and manage inventory levels"
        gradient="from-indigo-600 to-blue-700" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Total Products" value={summary.totalProducts ?? 0} color="primary" />
        <StatCard icon={AlertTriangle} label="Low Stock" value={summary.lowStockCount ?? 0} color="amber" />
        <StatCard icon={Package} label="Out of Stock" value={summary.outOfStockCount ?? 0} color="red" />
        <StatCard icon={DollarSign} label="Stock Value" value={formatCurrency(totalStockValue)} color="green" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 max-w-sm">
          <Search size={15} className="text-gray-400" />
          <input placeholder="Search product name or SKU…" className="text-sm outline-none bg-transparent flex-1"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <DataTable columns={columns} data={stocks} loading={isLoading} emptyMessage="No stock records found." />

      {/* Adjust Modal */}
      <Modal open={!!adjustModal} onClose={() => setAdjustModal(null)} title={`Adjust Stock — ${adjustModal?.product?.name}`}>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {['in','out','adjust','return'].map(t => (
              <button key={t} onClick={() => setAdjustForm(f => ({ ...f, type: t }))}
                className={`py-2.5 rounded-xl text-sm font-medium border transition-colors capitalize ${adjustForm.type === t ? 'bg-primary-600 text-white border-primary-600 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {t}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
            <input type="number" min="1" value={adjustForm.quantity} onChange={e => setAdjustForm(f => ({ ...f, quantity: e.target.value }))}
              className="form-input" placeholder="Enter quantity" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Note</label>
            <input value={adjustForm.note} onChange={e => setAdjustForm(f => ({ ...f, note: e.target.value }))}
              className="form-input" placeholder="e.g. Physical count correction, damaged…" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => adjustMutation.mutate({ productId: adjustModal.product.id, body: { ...adjustForm, quantity: Number(adjustForm.quantity) } })}
              disabled={!adjustForm.quantity || adjustMutation.isPending}
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50">
              {adjustMutation.isPending ? 'Saving…' : 'Apply Adjustment'}
            </button>
            <button onClick={() => setAdjustModal(null)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Movement History Modal */}
      <Modal open={!!historyModal} onClose={() => setHistoryModal(null)} title={`Stock History — ${historyModal?.product?.name}`} size="lg">
        {historyLoading ? (
          <div className="flex justify-center py-8"><Spinner size="lg" /></div>
        ) : (
          <div>
            {/* Current stock summary */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">Current Stock</p>
                <p className="text-2xl font-bold text-gray-900">{historyModal?.quantity}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">Reserved</p>
                <p className="text-2xl font-bold text-amber-600">{historyModal?.reservedQuantity}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">Available</p>
                <p className="text-2xl font-bold text-green-600">{historyModal ? historyModal.quantity - historyModal.reservedQuantity : 0}</p>
              </div>
            </div>

            {/* Movement history */}
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Movement History</h3>
            {!historyData?.movements?.length ? (
              <p className="text-gray-400 text-sm text-center py-6">No movements recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {[...(historyData.movements || [])].reverse().map((m, i) => {
                  const isPositive = ['in','return','grn_received','order_cancelled','manual_add'].includes(m.type)
                  const colorClass = MOVEMENT_COLORS[m.type] || 'bg-gray-100 text-gray-600'
                  return (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${colorClass}`}>
                          {m.type?.replace(/_/g, ' ')}
                        </span>
                        <div>
                          {m.reference && <p className="text-xs font-medium text-gray-700">Ref: {m.reference}</p>}
                          {m.note && <p className="text-xs text-gray-500">{m.note}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-base ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : '-'}{m.quantity}
                        </p>
                        <p className="text-xs text-gray-400">{formatDateTime(m.createdAt)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
