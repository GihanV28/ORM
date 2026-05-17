import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { formatCurrency, formatDate } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import StatCard from '../components/ui/StatCard'
import Badge from '../components/ui/Badge'
import { RotateCcw, Search, ChevronRight, AlertTriangle, Trash2, CheckCircle } from 'lucide-react'

const RETURN_TYPES = ['return','damage','exchange']

export default function Returns() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('list') // list | find
  const [orderSearch, setOrderSearch] = useState('')
  const [orderResults, setOrderResults] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [returnItems, setReturnItems] = useState([])
  const [returnType, setReturnType] = useState('return')
  const [notes, setNotes] = useState('')
  const [restockItems, setRestockItems] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['returns', typeFilter, page],
    queryFn: () => api.get('/returns', { params: { type: typeFilter || undefined, page, limit: 25 } }).then(r => r.data.data),
  })

  const returns = data?.returns || []
  const stats = data?.stats || {}
  const pagination = data?.pagination || {}

  const searchOrders = async (q) => {
    if (!q) return setOrderResults([])
    const res = await api.get('/returns/search/orders', { params: { q } })
    setOrderResults(res.data.data.orders)
  }

  const selectOrder = (order) => {
    setSelectedOrder(order)
    const items = Array.isArray(order.items) ? order.items : []
    setReturnItems(items.map(i => ({ ...i, returnQty: 0, condition: 'good' })))
    setTab('process')
  }

  const returnMutation = useMutation({
    mutationFn: () => api.post('/returns', {
      orderId: selectedOrder.id,
      type: returnType,
      items: returnItems.filter(i => i.returnQty > 0).map(i => ({
        productId: i.productId || null,
        productName: i.productName,
        sku: i.sku,
        quantity: i.returnQty,
        unitPrice: i.unitPrice,
        condition: i.condition,
      })),
      restockItems,
      notes,
    }),
    onSuccess: () => {
      qc.invalidateQueries(['returns'])
      setTab('list')
      setSelectedOrder(null)
      setReturnItems([])
      setNotes('')
      toast.success('Return processed successfully')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to process return')
  })

  const columns = [
    { key: 'returnNumber', label: 'Return #', render: r => <span className="font-mono text-xs font-bold text-primary-700">{r.returnNumber}</span> },
    { key: 'order', label: 'Order', render: r => <span className="font-mono text-xs">{r.order?.orderNumber}</span> },
    { key: 'customer', label: 'Customer', render: r => r.order?.customerName || '—' },
    { key: 'type', label: 'Type', render: r => (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${r.type === 'damage' ? 'bg-red-100 text-red-700' : r.type === 'exchange' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
        {r.type === 'damage' ? <AlertTriangle size={10} className="mr-1" /> : r.type === 'return' ? <RotateCcw size={10} className="mr-1" /> : null}
        {r.type}
      </span>
    )},
    { key: 'totalAmount', label: 'Value', render: r => formatCurrency(r.totalAmount) },
    { key: 'refundAmount', label: 'Refund', render: r => <span className="font-semibold text-green-700">{formatCurrency(r.refundAmount)}</span> },
    { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
    { key: 'createdAt', label: 'Date', render: r => formatDate(r.createdAt) },
  ]

  return (
    <div className="p-6 space-y-5">
      <PageHeader icon={RotateCcw} title="Returns & Damages" subtitle="Process customer returns, damages and exchanges"
        gradient="from-orange-500 to-red-600"
        actions={
          <button onClick={() => setTab('find')} className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-semibold transition-colors">
            <Search size={15} /> Find Order to Return
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={RotateCcw} label="Total Returns" value={stats.total ?? 0} color="orange" />
        <StatCard icon={RotateCcw} label="Return Orders" value={stats.returnCount ?? 0} color="amber" />
        <StatCard icon={AlertTriangle} label="Damaged Items" value={stats.damageCount ?? 0} color="red" />
        <StatCard icon={CheckCircle} label="Total Refund Value" value={formatCurrency(stats.refundValue)} color="green" />
      </div>

      {/* Tab: Find Order */}
      {tab === 'find' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Find Order for Return</h2>
            <button onClick={() => setTab('list')} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">← Back to list</button>
          </div>
          <input value={orderSearch} onChange={e => { setOrderSearch(e.target.value); searchOrders(e.target.value) }}
            className="form-input mb-3" placeholder="Search by order number, customer name or phone…" autoFocus />
          <div className="space-y-2">
            {orderResults.map(order => (
              <button key={order.id} onClick={() => selectOrder(order)}
                className="w-full text-left p-4 bg-gray-50 hover:bg-primary-50 border border-gray-200 hover:border-primary-200 rounded-xl transition-all flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                  <p className="text-sm text-gray-500">{order.customerName} · {order.customerPhone}</p>
                  <p className="text-xs text-gray-400">{formatDate(order.createdAt)} · {formatCurrency(order.total)} · <Badge status={order.status} /></p>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </button>
            ))}
            {orderSearch && orderResults.length === 0 && <p className="text-gray-400 text-sm text-center py-6">No delivered orders found</p>}
          </div>
        </div>
      )}

      {/* Tab: Process Return */}
      {tab === 'process' && selectedOrder && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Process Return — {selectedOrder.orderNumber}</h2>
              <p className="text-sm text-gray-500">{selectedOrder.customerName} · {formatCurrency(selectedOrder.total)}</p>
            </div>
            <button onClick={() => { setTab('find'); setSelectedOrder(null) }} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">← Change order</button>
          </div>

          {/* Return type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Return Type</label>
            <div className="grid grid-cols-3 gap-2">
              {RETURN_TYPES.map(t => (
                <button key={t} onClick={() => setReturnType(t)}
                  className={`py-2.5 rounded-xl text-sm font-semibold capitalize border transition-all ${returnType === t ? 'bg-primary-600 text-white border-primary-600 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Select Items to Return</label>
            <div className="space-y-2">
              {returnItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.productName}</p>
                    <p className="text-xs text-gray-400">{item.sku} · Ordered: {item.quantity} · {formatCurrency(item.unitPrice)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500">Return qty:</label>
                    <input type="number" min="0" max={item.quantity} value={item.returnQty}
                      onChange={e => setReturnItems(returnItems.map((it, i) => i === idx ? { ...it, returnQty: Math.min(Number(e.target.value), it.quantity) } : it))}
                      className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-center text-sm outline-none focus:ring-2 focus:ring-primary-500" />
                    <select value={item.condition}
                      onChange={e => setReturnItems(returnItems.map((it, i) => i === idx ? { ...it, condition: e.target.value } : it))}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none">
                      <option value="good">Good</option>
                      <option value="damaged">Damaged</option>
                      <option value="defective">Defective</option>
                    </select>
                  </div>
                  <span className="text-sm font-bold w-20 text-right">{formatCurrency(item.returnQty * item.unitPrice)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="restock" checked={restockItems} onChange={e => setRestockItems(e.target.checked)} className="w-4 h-4 rounded" />
              <label htmlFor="restock" className="text-sm font-medium text-gray-700">Restock returned items</label>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} className="form-input text-sm" placeholder="Optional notes…" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div>
              <p className="text-sm text-gray-500">Return value:</p>
              <p className="font-bold text-lg text-orange-600">{formatCurrency(returnItems.filter(i => i.returnQty > 0).reduce((s, i) => s + i.returnQty * i.unitPrice, 0))}</p>
            </div>
            <button onClick={() => returnMutation.mutate()}
              disabled={returnMutation.isPending || returnItems.every(i => i.returnQty === 0)}
              className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50">
              {returnMutation.isPending ? 'Processing…' : 'Process Return'}
            </button>
          </div>
        </div>
      )}

      {/* Returns list */}
      {tab === 'list' && (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex gap-3">
            <div className="flex gap-1.5">
              {[['','All'],['return','Returns'],['damage','Damages'],['exchange','Exchanges']].map(([val, label]) => (
                <button key={val} onClick={() => { setTypeFilter(val); setPage(1) }}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${typeFilter === val ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <DataTable columns={columns} data={returns} loading={isLoading} emptyMessage="No returns recorded." />
          {pagination.pages > 1 && (
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>{pagination.total} returns</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">Prev</button>
                <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
