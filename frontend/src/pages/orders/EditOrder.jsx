import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { formatCurrency, DISTRICTS, PAYMENT_METHODS } from '../../lib/utils'
import Spinner from '../../components/ui/Spinner'
import { ArrowLeft, Search, Trash2, Plus } from 'lucide-react'

const useDebounce = (value, delay = 400) => {
  const [dv, setDv] = useState(value)
  useEffect(() => { const t = setTimeout(() => setDv(value), delay); return () => clearTimeout(t) }, [value, delay])
  return dv
}

export default function EditOrder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [form, setForm] = useState(null)
  const [items, setItems] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState([])
  const debouncedSearch = useDebounce(productSearch)

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`).then(r => r.data.data.order),
  })

  useEffect(() => {
    if (order && !form) {
      setForm({
        customerName: order.customerName || '',
        customerPhone: order.customerPhone || '',
        alternativePhone: order.alternativePhone || '',
        customerEmail: order.customerEmail || '',
        shippingAddress: order.shippingAddress || '',
        addressLine2: order.addressLine2 || '',
        city: order.city || '',
        district: order.district || '',
        postalCode: order.postalCode || '',
        shippingCost: order.shippingCost || 0,
        discount: order.discount || 0,
        paymentMethod: order.paymentMethod || 'cod',
        notes: order.notes || '',
        internalNotes: order.internalNotes || '',
        deliveryCompany: order.deliveryCompany || '',
      })
      const existingItems = Array.isArray(order.items) ? order.items : []
      setItems(existingItems.map(i => ({
        product: i.productId || i.product,
        productName: i.productName,
        sku: i.sku,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        unitCost: i.unitCost || 0,
        discount: i.discount || 0,
      })))
    }
  }, [order])

  useEffect(() => {
    if (!debouncedSearch) return setProductResults([])
    api.get('/internal/search/products', { params: { q: debouncedSearch } })
      .then(r => setProductResults(r.data.data.products))
  }, [debouncedSearch])

  const addProduct = (p) => {
    const existing = items.find(i => i.product === p.id)
    if (existing) {
      setItems(items.map(i => i.product === p.id ? { ...i, quantity: i.quantity + 1 } : i))
    } else {
      setItems([...items, { product: p.id, productName: p.name, sku: p.itemCode, quantity: 1, unitPrice: p.price || p.sellingPrice, unitCost: p.costPrice || 0, discount: 0 }])
    }
    setProductSearch(''); setProductResults([])
  }

  const saveMutation = useMutation({
    mutationFn: () => api.put(`/orders/${id}`, {
      ...form,
      shippingCost: Number(form.shippingCost),
      discount: Number(form.discount),
      items: items.map(i => ({ product: i.product, productId: i.product, productName: i.productName, sku: i.sku, quantity: i.quantity, unitPrice: i.unitPrice, unitCost: i.unitCost, discount: i.discount || 0 }))
    }),
    onSuccess: () => {
      qc.invalidateQueries(['order', id])
      toast.success('Order updated successfully')
      navigate(`/orders/${id}`)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to update order')
  })

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity - (i.discount || 0), 0)
  const total = Math.max(0, subtotal + Number(form?.shippingCost || 0) - Number(form?.discount || 0))
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  if (isLoading || !form) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>

  return (
    <div className="p-6 max-w-5xl space-y-5">
      <div className="flex items-center gap-3">
        <Link to={`/orders/${id}`} className="text-gray-400 hover:text-gray-700"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Edit Order — {order.orderNumber}</h1>
          <p className="text-xs text-gray-400 mt-0.5">Changes will adjust stock levels automatically</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          {/* Customer */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Customer Details</h2>
            <div className="grid grid-cols-2 gap-3">
              {[['customerName','Customer Name *'],['customerPhone','Phone *'],['alternativePhone','Alt. Phone'],['customerEmail','Email']].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input value={form[key]} onChange={e => f(key, e.target.value)} className="form-input" />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Shipping Address *</label>
                <input value={form.shippingAddress} onChange={e => f('shippingAddress', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Address Line 2</label>
                <input value={form.addressLine2} onChange={e => f('addressLine2', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">City *</label>
                <input value={form.city} onChange={e => f('city', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">District *</label>
                <select value={form.district} onChange={e => f('district', e.target.value)} className="form-select">
                  <option value="">Select district</option>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Postal Code</label>
                <input value={form.postalCode} onChange={e => f('postalCode', e.target.value)} className="form-input" />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Order Items</h2>
            <div className="relative mb-4">
              <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
              <input placeholder="Search and add products…" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                className="form-input pl-9" />
              {productResults.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-56 overflow-y-auto">
                  {productResults.map(p => (
                    <button key={p.id} onClick={() => addProduct(p)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm flex justify-between">
                      <div><p className="font-medium">{p.name}</p><p className="text-gray-400 text-xs">{p.itemCode} · Stock: {p.stock}</p></div>
                      <span className="text-primary-600 font-medium">{formatCurrency(p.price || p.sellingPrice)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 ? (
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                  <th className="pb-2">Product</th>
                  <th className="pb-2 text-center">Qty</th>
                  <th className="pb-2 text-right">Price</th>
                  <th className="pb-2 text-right">Disc.</th>
                  <th className="pb-2 text-right">Total</th>
                  <th className="pb-2"></th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2"><p className="font-medium">{item.productName}</p><p className="text-xs text-gray-400">{item.sku}</p></td>
                      <td className="py-2">
                        <input type="number" min="1" value={item.quantity}
                          onChange={e => setItems(items.map((it, i) => i === idx ? { ...it, quantity: Number(e.target.value) } : it))}
                          className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-center text-sm mx-auto block" />
                      </td>
                      <td className="py-2">
                        <input type="number" value={item.unitPrice}
                          onChange={e => setItems(items.map((it, i) => i === idx ? { ...it, unitPrice: Number(e.target.value) } : it))}
                          className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-right text-sm ml-auto block" />
                      </td>
                      <td className="py-2">
                        <input type="number" value={item.discount}
                          onChange={e => setItems(items.map((it, i) => i === idx ? { ...it, discount: Number(e.target.value) } : it))}
                          className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-right text-sm ml-auto block" />
                      </td>
                      <td className="py-2 text-right font-medium">{formatCurrency(item.unitPrice * item.quantity - (item.discount || 0))}</td>
                      <td className="py-2 pl-2"><button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-gray-400 text-sm text-center py-6">No items. Search above to add products.</p>}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Notes</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer Notes</label>
                <textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={3} className="form-textarea" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Internal Notes</label>
                <textarea value={form.internalNotes} onChange={e => f('internalNotes', e.target.value)} rows={3} className="form-textarea" />
              </div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Shipping Cost</label>
                <input type="number" value={form.shippingCost} onChange={e => f('shippingCost', e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Discount</label>
                <input type="number" value={form.discount} onChange={e => f('discount', e.target.value)} className="form-input" />
              </div>
              <div className="flex justify-between font-bold text-base border-t border-gray-100 pt-2">
                <span>Total</span><span className="text-primary-700">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-gray-900 mb-1">Payment & Delivery</h2>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
              <select value={form.paymentMethod} onChange={e => f('paymentMethod', e.target.value)} className="form-select">
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Delivery Company</label>
              <input value={form.deliveryCompany} onChange={e => f('deliveryCompany', e.target.value)} className="form-input" />
            </div>
          </div>

          <button onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || items.length === 0 || !form.customerName || !form.customerPhone}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-2xl py-3 font-semibold transition-colors disabled:opacity-50 shadow-lg shadow-primary-500/25">
            {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
          <Link to={`/orders/${id}`} className="block text-center text-sm text-gray-500 hover:text-gray-700 transition-colors">Cancel</Link>
        </div>
      </div>
    </div>
  )
}
