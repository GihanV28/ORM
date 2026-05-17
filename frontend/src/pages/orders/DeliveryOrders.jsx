import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { formatCurrency, formatDate } from '../../lib/utils'
import PageHeader from '../../components/ui/PageHeader'
import DataTable from '../../components/ui/DataTable'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { Truck, ExternalLink, RefreshCw, Send } from 'lucide-react'

export default function DeliveryOrders() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [dispatchModal, setDispatchModal] = useState(null)
  const [dispatchForm, setDispatchForm] = useState({ weight: '0.5', description: '', exchange: '0' })

  const { data, isLoading } = useQuery({
    queryKey: ['orders-delivery', search, page],
    queryFn: () => api.get('/orders', {
      params: { status: 'confirm', search, page, limit: 30 }
    }).then(r => r.data.data),
  })

  // Also fetch dispatched/shipped to show tracking
  const { data: trackingData } = useQuery({
    queryKey: ['orders-tracking', search],
    queryFn: () => api.get('/orders', {
      params: { search, limit: 50, page: 1 }
    }).then(r => r.data.data),
  })

  const orders = data?.orders || []
  const pagination = data?.pagination || {}

  const dispatchMutation = useMutation({
    mutationFn: ({ id, body }) => api.post(`/orders/${id}/dispatch`, body),
    onSuccess: (res, { id }) => {
      qc.invalidateQueries(['orders-delivery'])
      setDispatchModal(null)
      toast.success(`Waybill created: ${res.data.data.waybillNumber}`)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Fardar error')
  })

  const openDispatch = (order) => {
    const items = Array.isArray(order.items) ? order.items : []
    const desc = items.map(i => `${i.productName} x${i.quantity}`).join(', ')
    setDispatchForm({ weight: '0.5', description: desc, exchange: '0' })
    setDispatchModal(order)
  }

  const columns = [
    { key: 'orderNumber', label: 'Order #', render: r => (
      <Link to={`/orders/${r.id}`} className="font-mono text-xs font-semibold text-primary-700 hover:underline">{r.orderNumber}</Link>
    )},
    { key: 'customer', label: 'Customer', render: r => (
      <div>
        <p className="font-medium text-gray-900">{r.customerName}</p>
        <p className="text-xs text-gray-400">{r.customerPhone}</p>
      </div>
    )},
    { key: 'city', label: 'City / District', render: r => <span className="text-gray-700">{r.city}, {r.district}</span> },
    { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
    { key: 'amount', label: 'COD', render: r => <span className="font-semibold text-gray-900">{formatCurrency(r.codAmount || r.total)}</span> },
    { key: 'waybill', label: 'Waybill', render: r => r.waybillNumber ? (
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-bold text-primary-700">{r.waybillNumber}</span>
        <a href={`https://www.fdedomestic.com/client/parcel_tracking.php?waybill=${r.waybillNumber}`}
          target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary-600">
          <ExternalLink size={12} />
        </a>
      </div>
    ) : <span className="text-gray-300 text-xs">Not dispatched</span>},
    { key: 'courier', label: 'Courier', render: r => r.deliveryCompany || '—' },
    { key: 'actions', label: '', render: r => !r.waybillNumber ? (
      <button onClick={() => openDispatch(r)}
        className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors">
        <Send size={11} /> Send to Fardar
      </button>
    ) : (
      <Link to={`/orders/${r.id}`} className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50 transition-colors">
        View
      </Link>
    )}
  ]

  return (
    <div className="p-6 space-y-5">
      <PageHeader icon={Truck} title="Delivery Orders" subtitle="Orders ready for dispatch or currently in delivery"
        gradient="from-purple-600 to-indigo-700"
        actions={
          <Link to="/orders/print-waybills" className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium transition-colors">
            Print Waybills
          </Link>
        }
      />

      {/* Status filter tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 max-w-sm">
          <input placeholder="Search by order #, customer, phone…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="text-sm outline-none bg-transparent flex-1" />
        </div>
      </div>

      <DataTable columns={columns} data={orders} loading={isLoading} emptyMessage="No confirmed orders awaiting dispatch." />

      {pagination.pages > 1 && (
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>{pagination.total} orders</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">Prev</button>
            <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">Next</button>
          </div>
        </div>
      )}

      {/* Dispatch Modal */}
      <Modal open={!!dispatchModal} onClose={() => setDispatchModal(null)} title={`Send to Fardar — ${dispatchModal?.orderNumber}`}>
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm">
            <p className="font-semibold text-gray-900">{dispatchModal?.customerName}</p>
            <p className="text-gray-600">{dispatchModal?.customerPhone}</p>
            <p className="text-gray-600">{dispatchModal?.shippingAddress}, {dispatchModal?.city}</p>
            <p className="font-bold text-primary-700 mt-1">COD: {formatCurrency(dispatchModal?.codAmount || dispatchModal?.total)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg) *</label>
              <input type="number" step="0.1" min="0.1" value={dispatchForm.weight}
                onChange={e => setDispatchForm(f => ({ ...f, weight: e.target.value }))} className="form-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parcel Type</label>
              <select value={dispatchForm.exchange} onChange={e => setDispatchForm(f => ({ ...f, exchange: e.target.value }))} className="form-select">
                <option value="0">Normal</option>
                <option value="1">Exchange Return</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parcel Description *</label>
            <input value={dispatchForm.description} onChange={e => setDispatchForm(f => ({ ...f, description: e.target.value }))} className="form-input" placeholder="e.g. Saree x1, Blouse x2" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => dispatchMutation.mutate({ id: dispatchModal.id, body: dispatchForm })}
              disabled={dispatchMutation.isPending || !dispatchForm.weight || !dispatchForm.description}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              <Send size={14} /> {dispatchMutation.isPending ? 'Sending…' : 'Confirm & Send to Fardar'}
            </button>
            <button onClick={() => setDispatchModal(null)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
