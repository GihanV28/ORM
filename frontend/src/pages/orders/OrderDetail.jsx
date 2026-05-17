import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { formatCurrency, formatDateTime, ORDER_STATUSES, PAYMENT_STATUSES, PAYMENT_METHODS } from '../../lib/utils'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import {
  ArrowLeft, Truck, CreditCard, Phone, Send, ExternalLink,
  Package, Printer, FileText, Edit, MessageSquare, Clock, User
} from 'lucide-react'

export default function OrderDetail() {
  const { id } = useParams()
  const qc = useQueryClient()

  const [editStatus, setEditStatus] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [editPayment, setEditPayment] = useState(false)
  const [payData, setPayData] = useState({ paymentStatus: '', paymentMethod: '', codAmount: '' })
  const [showCallModal, setShowCallModal] = useState(false)
  const [callNotes, setCallNotes] = useState('')
  const [fardarForm, setFardarForm] = useState({ weight: '0.5', description: '', exchange: '0', existingWaybillId: '' })
  const [showFardarForm, setShowFardarForm] = useState(false)

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`).then(r => r.data.data.order),
  })

  useEffect(() => {
    if (order) {
      setNewStatus(order.status)
      setCallNotes(order.callNotes || '')
      setPayData({ paymentStatus: order.paymentStatus, paymentMethod: order.paymentMethod, codAmount: order.codAmount || '' })
    }
  }, [order])

  const invalidate = () => qc.invalidateQueries(['order', id])

  const statusMutation = useMutation({
    mutationFn: ({ status, note }) => api.patch(`/orders/${id}/status`, { status, note }),
    onSuccess: () => { invalidate(); setEditStatus(false); setStatusNote(''); toast.success('Status updated') }
  })

  const paymentMutation = useMutation({
    mutationFn: (body) => api.patch(`/orders/${id}/payment`, body),
    onSuccess: () => { invalidate(); setEditPayment(false); toast.success('Payment updated') }
  })

  const callMutation = useMutation({
    mutationFn: (notes) => api.patch(`/orders/${id}/call`, { notes }),
    onSuccess: () => { invalidate(); setShowCallModal(false); toast.success('Call recorded') }
  })

  const dispatchMutation = useMutation({
    mutationFn: (body) => api.post(`/orders/${id}/dispatch`, body),
    onSuccess: (res) => {
      invalidate(); setShowFardarForm(false)
      toast.success(`Waybill created: ${res.data.data.waybillNumber}`)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Fardar error')
  })

  if (isLoading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>
  if (!order) return <div className="p-6 text-gray-500">Order not found</div>

  const items = Array.isArray(order.items) ? order.items : []
  const history = Array.isArray(order.trackingHistory) ? order.trackingHistory : []
  const profit = order.profit || items.reduce((s, i) => s + ((i.unitPrice - (i.unitCost || 0)) * i.quantity), 0)

  return (
    <div className="p-6 max-w-6xl space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/orders" className="text-gray-400 hover:text-gray-700 transition-colors"><ArrowLeft size={20} /></Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{order.orderNumber}</h1>
              <Badge status={order.status} className="text-sm" />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(order.createdAt)} · Source: <span className="capitalize">{order.source}</span></p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to={`/orders/${id}/edit`}
            className="flex items-center gap-1.5 px-3 py-2 border border-primary-200 bg-primary-50 rounded-xl text-sm text-primary-700 hover:bg-primary-100 transition-colors font-medium">
            <Edit size={14} /> Edit Order
          </Link>
          <Link to={`/orders/${id}/print`} target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <FileText size={14} /> Invoice
          </Link>
          <Link to="/orders/print-waybills"
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Printer size={14} /> Waybills
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ===== LEFT (2 cols) ===== */}
        <div className="lg:col-span-2 space-y-5">

          {/* Order Items */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Order Items</h2>
              <span className="text-xs text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Qty</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Disc.</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900">{item.productName}</p>
                      <p className="text-xs text-gray-400">{item.sku}</p>
                    </td>
                    <td className="px-6 py-3 text-center font-medium">{item.quantity}</td>
                    <td className="px-6 py-3 text-right text-gray-700">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-6 py-3 text-right text-red-500">{item.discount ? `-${formatCurrency(item.discount)}` : '—'}</td>
                    <td className="px-6 py-3 text-right font-semibold">{formatCurrency((item.unitPrice * item.quantity) - (item.discount || 0))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-200">
                <tr><td colSpan="4" className="px-6 pt-3 text-right text-sm text-gray-500">Subtotal</td><td className="px-6 pt-3 text-right font-medium">{formatCurrency(order.subtotal)}</td></tr>
                {order.shippingCost > 0 && <tr><td colSpan="4" className="px-6 text-right text-sm text-gray-500">Shipping</td><td className="px-6 text-right">{formatCurrency(order.shippingCost)}</td></tr>}
                {order.discount > 0 && <tr><td colSpan="4" className="px-6 text-right text-sm text-red-500">Discount</td><td className="px-6 text-right text-red-500">-{formatCurrency(order.discount)}</td></tr>}
                <tr><td colSpan="4" className="px-6 pb-3 text-right font-bold text-gray-900">Total</td><td className="px-6 pb-3 text-right font-bold text-primary-700 text-base">{formatCurrency(order.total)}</td></tr>
                {profit > 0 && <tr className="bg-green-50"><td colSpan="4" className="px-6 py-2 text-right text-xs text-green-600 font-medium">Profit</td><td className="px-6 py-2 text-right font-bold text-green-700">{formatCurrency(profit)}</td></tr>}
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          {(order.notes || order.internalNotes || order.callNotes) && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
              <h2 className="font-semibold text-gray-900">Notes</h2>
              {order.notes && <div className="p-3 bg-gray-50 rounded-xl text-sm"><span className="text-xs font-semibold text-gray-400 uppercase">Customer: </span>{order.notes}</div>}
              {order.internalNotes && <div className="p-3 bg-amber-50 rounded-xl text-sm border border-amber-100"><span className="text-xs font-semibold text-amber-500 uppercase">Internal: </span>{order.internalNotes}</div>}
              {order.callNotes && <div className="p-3 bg-blue-50 rounded-xl text-sm border border-blue-100"><span className="text-xs font-semibold text-blue-500 uppercase"><Phone size={10} className="inline mr-1" />Call Notes: </span>{order.callNotes}</div>}
            </div>
          )}

          {/* Status History */}
          {history.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Clock size={15} className="text-primary-600" /> Status History</h2>
              <div className="relative pl-5">
                <div className="absolute left-1.5 top-0 bottom-0 w-px bg-gray-200" />
                <div className="space-y-4">
                  {[...history].reverse().map((entry, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full bg-primary-500 border-2 border-white shadow-sm" />
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <Badge status={entry.status} />
                          <span className="text-xs text-gray-400">{formatDateTime(entry.timestamp)}</span>
                        </div>
                        {entry.note && <p className="text-xs text-gray-600 mt-1">{entry.note}</p>}
                        {entry.changedBy && (
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><User size={10} /> {entry.changedBy}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== RIGHT (1 col) ===== */}
        <div className="space-y-4">

          {/* Customer */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Customer</h2>
            <p className="font-semibold text-gray-900">{order.customerName}</p>
            <p className="text-sm text-gray-600 mt-1">{order.customerPhone}</p>
            {order.alternativePhone && <p className="text-sm text-gray-500">{order.alternativePhone}</p>}
            {order.customerEmail && <p className="text-sm text-gray-500">{order.customerEmail}</p>}
          </div>

          {/* Shipping */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Truck size={14} />Shipping</h2>
            <p className="text-sm text-gray-700">{order.shippingAddress}</p>
            {order.addressLine2 && <p className="text-sm text-gray-600">{order.addressLine2}</p>}
            <p className="text-sm text-gray-700">{order.city}, {order.district}</p>
            {order.postalCode && <p className="text-sm text-gray-500">{order.postalCode}</p>}
            {order.deliveryCompany && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                <p className="text-xs text-gray-500">Courier: <span className="font-medium text-gray-700">{order.deliveryCompany}</span></p>
                {order.waybillNumber && <p className="text-xs text-gray-500">Waybill: <span className="font-mono font-bold text-primary-700">{order.waybillNumber}</span></p>}
                {order.waybillSyncedAt && <p className="text-xs text-gray-400">Synced: {formatDateTime(order.waybillSyncedAt)}</p>}
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2"><CreditCard size={14} />Payment</h2>
              <button onClick={() => setEditPayment(e => !e)} className="text-xs text-primary-600 hover:underline"><Edit size={11} className="inline" /> Edit</button>
            </div>
            {editPayment ? (
              <div className="space-y-2">
                <select value={payData.paymentStatus} onChange={e => setPayData(p => ({ ...p, paymentStatus: e.target.value }))} className="form-select text-sm">
                  {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
                <select value={payData.paymentMethod} onChange={e => setPayData(p => ({ ...p, paymentMethod: e.target.value }))} className="form-select text-sm">
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
                </select>
                <input type="number" placeholder="COD Amount" value={payData.codAmount} onChange={e => setPayData(p => ({ ...p, codAmount: e.target.value }))} className="form-input text-sm" />
                <div className="flex gap-2">
                  <button onClick={() => paymentMutation.mutate(payData)} disabled={paymentMutation.isPending} className="flex-1 bg-primary-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50">Save</button>
                  <button onClick={() => setEditPayment(false)} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm hover:bg-gray-50 transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Method</span><span className="font-medium capitalize">{order.paymentMethod?.replace(/_/g, ' ')}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Status</span><Badge status={order.paymentStatus} /></div>
                {order.codAmount && <div className="flex justify-between"><span className="text-gray-500">COD Amount</span><span className="font-bold text-red-600">{formatCurrency(order.codAmount)}</span></div>}
              </div>
            )}
          </div>

          {/* Update Status */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Update Status</h2>
            {editStatus ? (
              <div className="space-y-2">
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="form-select text-sm">
                  {ORDER_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
                <textarea value={statusNote} onChange={e => setStatusNote(e.target.value)} rows={2} placeholder="Reason or note (optional)…" className="form-textarea text-sm" />
                <div className="flex gap-2">
                  <button onClick={() => statusMutation.mutate({ status: newStatus, note: statusNote })} disabled={statusMutation.isPending}
                    className="flex-1 bg-primary-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50">Update</button>
                  <button onClick={() => setEditStatus(false)} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm hover:bg-gray-50 transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setNewStatus(order.status); setEditStatus(true) }}
                className="w-full border border-primary-200 text-primary-700 rounded-xl py-2.5 text-sm font-medium hover:bg-primary-50 transition-colors">
                Change Status
              </button>
            )}

            {/* Record Call */}
            <button onClick={() => setShowCallModal(true)}
              className="mt-2 w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition-colors">
              <Phone size={14} />
              {order.calledAt ? `Called ${formatDateTime(order.calledAt)}` : 'Record Call'}
            </button>
          </div>

          {/* Fardar Express */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Package size={14} className="text-red-600" />Fardar Express</h2>
            {order.waybillNumber ? (
              <div className="space-y-2">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-green-600 font-medium">Waybill Assigned</p>
                  <p className="font-mono font-bold text-green-800 text-lg">{order.waybillNumber}</p>
                  {order.waybillSyncedAt && <p className="text-xs text-green-500 mt-0.5">Sent {formatDateTime(order.waybillSyncedAt)}</p>}
                </div>
                <a href={`https://www.fdedomestic.com/client/parcel_tracking.php?waybill=${order.waybillNumber}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 rounded-xl py-2 text-sm hover:bg-gray-50 transition-colors">
                  <ExternalLink size={13} /> Track on Fardar
                </a>
              </div>
            ) : !showFardarForm ? (
              <button onClick={() => {
                const desc = items.map(i => `${i.productName} x${i.quantity}`).join(', ')
                setFardarForm(f => ({ ...f, description: desc }))
                setShowFardarForm(true)
              }} className="w-full flex items-center justify-center gap-2 bg-red-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-red-700 transition-colors">
                <Send size={14} /> Send to Fardar
              </button>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Weight (kg) *</label>
                    <input type="number" step="0.1" min="0.1" value={fardarForm.weight} onChange={e => setFardarForm(f => ({ ...f, weight: e.target.value }))} className="form-input text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Type</label>
                    <select value={fardarForm.exchange} onChange={e => setFardarForm(f => ({ ...f, exchange: e.target.value }))} className="form-select text-sm">
                      <option value="0">Normal</option>
                      <option value="1">Exchange</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Description *</label>
                  <input value={fardarForm.description} onChange={e => setFardarForm(f => ({ ...f, description: e.target.value }))} className="form-input text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Pre-assigned Waybill # (optional)</label>
                  <input value={fardarForm.existingWaybillId} onChange={e => setFardarForm(f => ({ ...f, existingWaybillId: e.target.value }))} className="form-input text-sm font-mono" placeholder="Leave blank to auto-generate" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => dispatchMutation.mutate(fardarForm)} disabled={dispatchMutation.isPending || !fardarForm.weight || !fardarForm.description}
                    className="flex-1 bg-red-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
                    {dispatchMutation.isPending ? <Spinner size="sm" /> : <Send size={13} />}
                    {dispatchMutation.isPending ? 'Sending…' : 'Confirm & Send'}
                  </button>
                  <button onClick={() => setShowFardarForm(false)} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm hover:bg-gray-50 transition-colors">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Call Notes Modal */}
      <Modal open={showCallModal} onClose={() => setShowCallModal(false)} title="Record Customer Call" size="sm">
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <Phone size={16} className="text-blue-600 shrink-0" />
            <div>
              <p className="font-semibold text-sm text-gray-900">{order.customerName}</p>
              <p className="text-sm text-primary-700">{order.customerPhone}</p>
            </div>
          </div>
          {order.calledAt && <p className="text-xs text-gray-400">Last called: {formatDateTime(order.calledAt)}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Call Notes</label>
            <textarea value={callNotes} onChange={e => setCallNotes(e.target.value)} rows={4}
              className="form-textarea"
              placeholder="What did the customer say? Any follow-up needed?…" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => callMutation.mutate(callNotes)} disabled={callMutation.isPending}
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              <Phone size={14} /> {callMutation.isPending ? 'Saving…' : 'Mark Called & Save Notes'}
            </button>
            <button onClick={() => setShowCallModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
