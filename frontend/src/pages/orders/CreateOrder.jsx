import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import api from '../../lib/api'
import { formatCurrency, DISTRICTS, PAYMENT_METHODS } from '../../lib/utils'
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react'

const useDebounce = (value, delay = 400) => {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debouncedValue
}

export default function CreateOrder() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    customerName: '', customerPhone: '', alternativePhone: '', customerEmail: '',
    shippingAddress: '', addressLine2: '', city: '', district: '', postalCode: '',
    shippingCost: 0, discount: 0, paymentMethod: 'cod', notes: '', internalNotes: '', deliveryCompany: '',
  })
  const [items, setItems] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState([])

  const debouncedProduct = useDebounce(productSearch)
  const debouncedCustomer = useDebounce(customerSearch)

  useEffect(() => {
    if (!debouncedProduct) return setProductResults([])
    api.get('/internal/search/products', { params: { q: debouncedProduct } })
      .then(r => setProductResults(r.data.data.products))
  }, [debouncedProduct])

  useEffect(() => {
    if (!debouncedCustomer) return setCustomerResults([])
    api.get('/internal/search/customers', { params: { q: debouncedCustomer } })
      .then(r => setCustomerResults(r.data.data.customers))
  }, [debouncedCustomer])

  const addProduct = (product) => {
    const existing = items.find(i => i.productId === product._id)
    if (existing) {
      setItems(items.map(i => i.productId === product._id ? { ...i, quantity: i.quantity + 1 } : i))
    } else {
      setItems([...items, {
        productId: product._id, productName: product.name, sku: product.sku,
        quantity: 1, unitPrice: product.sellingPrice, discount: 0
      }])
    }
    setProductSearch('')
    setProductResults([])
  }

  const fillCustomer = (c) => {
    setForm(f => ({ ...f, customerName: c.name, customerPhone: c.phone, customerEmail: c.email || '', shippingAddress: c.address || '', city: c.city || '', district: c.district || '' }))
    setCustomerSearch('')
    setCustomerResults([])
  }

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity - (i.discount || 0), 0)
  const total = Math.max(0, subtotal + Number(form.shippingCost) - Number(form.discount))

  const mutation = useMutation({
    mutationFn: () => api.post('/orders', {
      ...form,
      shippingCost: Number(form.shippingCost),
      discount: Number(form.discount),
      items: items.map(i => ({ product: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount || 0 }))
    }),
    onSuccess: (res) => navigate(`/orders/${res.data.data.order._id}`)
  })

  const f = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/orders" className="text-gray-500 hover:text-gray-700"><ArrowLeft size={20} /></Link>
        <h1 className="text-2xl font-bold text-gray-900">Create Order</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Customer Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Customer Details</h2>
            <div className="relative mb-4">
              <input
                placeholder="Search existing customer..."
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pl-9"
              />
              <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
              {customerResults.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1">
                  {customerResults.map(c => (
                    <button key={c._id} onClick={() => fillCustomer(c)} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-gray-400 text-xs">{c.phone} · {c.city}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['customerName','Name*','text'], ['customerPhone','Phone*','text'],
                ['alternativePhone','Alt. Phone','text'], ['customerEmail','Email','email'],
              ].map(([key, label, type]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type={type} value={form[key]} onChange={e => f(key, e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Shipping Address*</label>
                <input value={form.shippingAddress} onChange={e => f('shippingAddress', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Address Line 2</label>
                <input value={form.addressLine2} onChange={e => f('addressLine2', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">City*</label>
                <input value={form.city} onChange={e => f('city', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">District*</label>
                <select value={form.district} onChange={e => f('district', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Select district</option>
                  {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Postal Code</label>
                <input value={form.postalCode} onChange={e => f('postalCode', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Products</h2>
            <div className="relative mb-4">
              <input
                placeholder="Search product by name, SKU, or barcode..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm pl-9"
              />
              <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
              {productResults.length > 0 && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                  {productResults.map(p => (
                    <button key={p._id} onClick={() => addProduct(p)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm flex justify-between items-center">
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-gray-400 text-xs">{p.sku} · Stock: {p.stock}</p>
                      </div>
                      <span className="text-blue-700 font-medium">{formatCurrency(p.sellingPrice)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {items.length > 0 && (
              <table className="w-full text-sm mb-3">
                <thead><tr className="text-left text-gray-500 border-b text-xs">
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
                      <td className="py-2">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-gray-400 text-xs">{item.sku}</p>
                      </td>
                      <td className="py-2">
                        <input type="number" min="1" value={item.quantity}
                          onChange={e => setItems(items.map((it, i) => i === idx ? { ...it, quantity: Number(e.target.value) } : it))}
                          className="w-16 border rounded px-2 py-1 text-center text-sm mx-auto block" />
                      </td>
                      <td className="py-2 text-right">
                        <input type="number" value={item.unitPrice}
                          onChange={e => setItems(items.map((it, i) => i === idx ? { ...it, unitPrice: Number(e.target.value) } : it))}
                          className="w-24 border rounded px-2 py-1 text-right text-sm ml-auto block" />
                      </td>
                      <td className="py-2 text-right">
                        <input type="number" value={item.discount}
                          onChange={e => setItems(items.map((it, i) => i === idx ? { ...it, discount: Number(e.target.value) } : it))}
                          className="w-20 border rounded px-2 py-1 text-right text-sm ml-auto block" />
                      </td>
                      <td className="py-2 text-right font-medium">{formatCurrency(item.unitPrice * item.quantity - (item.discount || 0))}</td>
                      <td className="py-2 pl-2">
                        <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {items.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Search and add products above</p>}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Notes</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer Notes</label>
                <textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Internal Notes</label>
                <textarea value={form.internalNotes} onChange={e => f('internalNotes', e.target.value)} rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Shipping Cost</label>
                <input type="number" value={form.shippingCost} onChange={e => f('shippingCost', e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Discount</label>
                <input type="number" value={form.discount} onChange={e => f('discount', e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm" />
              </div>
              <div className="flex justify-between font-semibold text-base border-t pt-2">
                <span>Total</span><span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="font-semibold text-gray-800 mb-1">Payment & Delivery</h2>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
              <select value={form.paymentMethod} onChange={e => f('paymentMethod', e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm">
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Delivery Company</label>
              <input value={form.deliveryCompany} onChange={e => f('deliveryCompany', e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" placeholder="e.g. Curfox" />
            </div>
          </div>

          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || items.length === 0 || !form.customerName || !form.customerPhone || !form.shippingAddress || !form.city || !form.district}
            className="w-full bg-blue-700 text-white rounded-xl py-3 font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50"
          >
            {mutation.isPending ? 'Creating...' : 'Create Order'}
          </button>
          {mutation.isError && <p className="text-red-500 text-sm text-center">{mutation.error?.response?.data?.message}</p>}
        </div>
      </div>
    </div>
  )
}
