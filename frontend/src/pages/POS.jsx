import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { formatCurrency, formatDateTime } from '../lib/utils'
import Spinner from '../components/ui/Spinner'
import Modal from '../components/ui/Modal'
import { Scan, Search, Trash2, ShoppingBag, CreditCard, Plus, Minus, X, Printer, RotateCcw, Clock, ChevronRight } from 'lucide-react'

// ===== Receipt Component (printable) =====
function Receipt({ order, business, onClose }) {
  useEffect(() => { window.print() }, [])
  const items = Array.isArray(order?.items) ? order.items : []
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center p-4">
      <style>{`@media print { body * { visibility: hidden; } .receipt-print, .receipt-print * { visibility: visible; } .receipt-print { position: fixed; left: 0; top: 0; width: 80mm; } .no-print { display: none; } }`}</style>
      <div className="no-print flex gap-3 mb-4 mt-2">
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium"><Printer size={15} /> Print</button>
        <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm">Close</button>
      </div>
      <div className="receipt-print w-80 font-mono text-xs border border-gray-200 p-4">
        <div className="text-center mb-3">
          <p className="font-bold text-base">{business?.businessName || 'Adum Culture'}</p>
          {business?.phone && <p>{business.phone}</p>}
          {business?.address && <p className="text-xs">{business.address}</p>}
          <p className="border-t border-dashed border-gray-400 mt-2 pt-2 font-bold">SALES RECEIPT</p>
        </div>
        <div className="mb-2 text-xs">
          <div className="flex justify-between"><span>Order:</span><span className="font-bold">{order?.orderNumber}</span></div>
          <div className="flex justify-between"><span>Date:</span><span>{formatDateTime(order?.createdAt)}</span></div>
          <div className="flex justify-between"><span>Customer:</span><span>{order?.customerName}</span></div>
        </div>
        <div className="border-t border-dashed border-gray-400 pt-2 mb-2">
          {items.map((item, i) => (
            <div key={i} className="mb-1">
              <p className="font-medium truncate">{item.productName}</p>
              <div className="flex justify-between pl-2"><span>{item.quantity} x {formatCurrency(item.unitPrice)}</span><span className="font-bold">{formatCurrency(item.unitPrice * item.quantity)}</span></div>
            </div>
          ))}
        </div>
        <div className="border-t border-dashed border-gray-400 pt-2">
          {order?.discount > 0 && <div className="flex justify-between"><span>Discount:</span><span>-{formatCurrency(order.discount)}</span></div>}
          <div className="flex justify-between font-bold text-sm"><span>TOTAL:</span><span>{formatCurrency(order?.total)}</span></div>
          <div className="flex justify-between mt-1"><span>Payment:</span><span className="capitalize">{order?.paymentMethod}</span></div>
        </div>
        <p className="text-center mt-3 border-t border-dashed border-gray-400 pt-2">Thank you!</p>
      </div>
    </div>
  )
}

// ===== POS Session Guard =====
function SessionGuard({ children }) {
  const qc = useQueryClient()
  const [openingCash, setOpeningCash] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['pos-session'], queryFn: () => api.get('/pos/session/current').then(r => r.data.data.session) })

  const openMutation = useMutation({
    mutationFn: () => api.post('/pos/session/open', { openingCash: Number(openingCash) || 0 }),
    onSuccess: () => { qc.invalidateQueries(['pos-session']); toast.success('POS session opened') },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to open session')
  })

  if (isLoading) return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-600 to-indigo-700 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><ShoppingBag size={28} className="text-primary-600" /></div>
            <h2 className="text-2xl font-bold text-gray-900">Open POS Session</h2>
            <p className="text-gray-500 text-sm mt-1">Enter your opening cash to start selling</p>
          </div>
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Opening Cash (LKR)</label>
            <input type="number" value={openingCash} onChange={e => setOpeningCash(e.target.value)}
              className="form-input text-lg font-semibold" placeholder="0.00" />
          </div>
          <button onClick={() => openMutation.mutate()} disabled={openMutation.isPending}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-3 font-semibold transition-colors disabled:opacity-50">
            {openMutation.isPending ? 'Opening…' : 'Open Session & Start Selling'}
          </button>
          <Link to="/" className="block text-center text-sm text-gray-400 hover:text-gray-600 mt-3 transition-colors">← Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  return children({ session: data })
}

// ===== Main POS Counter =====
function PosCounter({ session }) {
  const qc = useQueryClient()
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [barcode, setBarcode] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [discount, setDiscount] = useState(0)
  const [customerName, setCustomerName] = useState('Walk-in')
  const [customerPhone, setCustomerPhone] = useState('0000000000')
  const [receipt, setReceipt] = useState(null)
  const [business, setBusiness] = useState(null)
  const [showReturn, setShowReturn] = useState(false)
  const [returnSearch, setReturnSearch] = useState('')
  const [returnOrders, setReturnOrders] = useState([])
  const [returnOrder, setReturnOrder] = useState(null)
  const [returnItems, setReturnItems] = useState([])
  const [showClose, setShowClose] = useState(false)
  const [closingCash, setClosingCash] = useState('')

  useEffect(() => { api.get('/settings').then(r => setBusiness(r.data.data.user)).catch(() => {}) }, [])

  const searchProducts = async (q) => {
    if (!q) return setSearchResults([])
    const res = await api.get('/internal/search/products', { params: { q } })
    setSearchResults(res.data.data.products)
  }

  const lookupBarcode = async (bc) => {
    if (!bc) return
    try {
      const res = await api.get('/internal/product/lookup', { params: { barcode: bc } })
      addToCart(res.data.data.product)
    } catch { toast.error('Product not found') }
    setBarcode('')
  }

  const addToCart = (product) => {
    const existing = cart.find(i => i._id === product._id || i._id === product.id)
    if (existing) {
      setCart(cart.map(i => (i._id === product._id || i._id === product.id) ? { ...i, qty: i.qty + 1 } : i))
    } else {
      setCart([...cart, { _id: product._id || product.id, name: product.name, sku: product.itemCode || product.sku, qty: 1, price: product.price || product.sellingPrice, costPrice: product.costPrice || 0 }])
    }
    setSearch(''); setSearchResults([])
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const total = Math.max(0, subtotal - Number(discount))

  const saleMutation = useMutation({
    mutationFn: () => api.post('/pos/sale', {
      sessionId: session.id, customerName, customerPhone,
      items: cart.map(i => ({ product: i._id, quantity: i.qty, unitPrice: i.price })),
      paymentMethod, discount: Number(discount),
    }),
    onSuccess: async (res) => {
      const order = res.data.data.order
      const receiptRes = await api.get(`/pos/receipt/${order.id}`)
      setReceipt({ order: receiptRes.data.data.order, business: receiptRes.data.data.business })
      setCart([]); setDiscount(0); setCustomerName('Walk-in'); setCustomerPhone('0000000000')
      qc.invalidateQueries(['pos-session'])
      toast.success('Sale complete!')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Sale failed')
  })

  const closeMutation = useMutation({
    mutationFn: () => api.post(`/pos/session/${session.id}/close`, { closingCash: Number(closingCash) }),
    onSuccess: () => { qc.invalidateQueries(['pos-session']); toast.success('Session closed'); window.location.href = '/' },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to close session')
  })

  const searchReturns = async (q) => {
    if (!q) return setReturnOrders([])
    const res = await api.get('/pos/returns/search', { params: { q } })
    setReturnOrders(res.data.data.orders)
  }

  const returnMutation = useMutation({
    mutationFn: () => api.post('/pos/returns', {
      orderId: returnOrder.id, type: 'return',
      items: returnItems.filter(i => i.returnQty > 0).map(i => ({ productId: i.productId, productName: i.productName, sku: i.sku, quantity: i.returnQty, unitPrice: i.unitPrice }))
    }),
    onSuccess: () => { setShowReturn(false); setReturnOrder(null); setReturnItems([]); toast.success('Return processed') }
  })

  const selectReturnOrder = (order) => {
    setReturnOrder(order)
    const items = Array.isArray(order.items) ? order.items : []
    setReturnItems(items.map(i => ({ ...i, returnQty: 0 })))
  }

  if (receipt) return <Receipt order={receipt.order} business={receipt.business} onClose={() => setReceipt(null)} />

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Left: Products */}
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Point of Sale</h1>
            <p className="text-xs text-gray-400">Session opened · {session.totalOrders} orders today</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowReturn(true)} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <RotateCcw size={14} /> Returns
            </button>
            <button onClick={() => setShowClose(true)} className="flex items-center gap-1.5 px-3 py-2 border border-red-200 bg-red-50 rounded-xl text-sm text-red-600 hover:bg-red-100 transition-colors">
              <Clock size={14} /> Close Session
            </button>
          </div>
        </div>

        {/* Barcode + Search */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
          <div className="flex gap-2">
            <input placeholder="Scan barcode / enter code…" value={barcode} onChange={e => setBarcode(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') lookupBarcode(barcode) }}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
            <button onClick={() => lookupBarcode(barcode)} className="px-4 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"><Scan size={18} /></button>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input placeholder="Search products by name or SKU…" value={search}
              onChange={e => { setSearch(e.target.value); searchProducts(e.target.value) }}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500" />
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto">
                {searchResults.map(p => (
                  <button key={p.id || p._id} onClick={() => addToCart(p)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm flex justify-between items-center transition-colors">
                    <div><p className="font-medium">{p.name}</p><p className="text-gray-400 text-xs">{p.itemCode || p.sku} · Stock: {p.stock}</p></div>
                    <span className="text-primary-600 font-semibold">{formatCurrency(p.price || p.sellingPrice)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Customer */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">Customer</p>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Customer name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
            <input placeholder="Phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-xl">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <span className="font-bold text-gray-900 flex items-center gap-2"><ShoppingBag size={18} className="text-primary-600" /> Cart ({cart.length})</span>
          {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-red-400 hover:text-red-600 transition-colors">Clear all</button>}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Scan or search to add products</p>
            </div>
          ) : cart.map(item => (
            <div key={item._id} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                <p className="text-xs text-gray-400">{formatCurrency(item.price)} each</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => setCart(cart.map(i => i._id === item._id ? { ...i, qty: Math.max(1, i.qty - 1) } : i))}
                  className="w-7 h-7 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"><Minus size={12} /></button>
                <span className="w-7 text-center text-sm font-bold">{item.qty}</span>
                <button onClick={() => setCart(cart.map(i => i._id === item._id ? { ...i, qty: i.qty + 1 } : i))}
                  className="w-7 h-7 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"><Plus size={12} /></button>
              </div>
              <span className="text-sm font-bold text-gray-800 w-20 text-right">{formatCurrency(item.price * item.qty)}</span>
              <button onClick={() => setCart(cart.filter(i => i._id !== item._id))} className="text-red-300 hover:text-red-500 transition-colors"><X size={14} /></button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-100 space-y-3">
          <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 w-20 shrink-0">Discount</span>
            <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex justify-between font-bold text-lg border-t border-gray-100 pt-2">
            <span>Total</span><span className="text-primary-700">{formatCurrency(total)}</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[['cash','Cash'],['card','Card'],['bank_transfer','Bank'],['credit','Credit']].map(([val, label]) => (
              <button key={val} onClick={() => setPaymentMethod(val)}
                className={`py-2 rounded-xl text-xs font-semibold transition-all ${paymentMethod === val ? 'bg-primary-600 text-white shadow-sm' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {label}
              </button>
            ))}
          </div>

          <button onClick={() => saleMutation.mutate()} disabled={cart.length === 0 || saleMutation.isPending}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl py-3.5 font-bold text-base transition-colors disabled:opacity-50 shadow-lg shadow-green-500/25">
            {saleMutation.isPending ? <Spinner size="sm" /> : <CreditCard size={20} />}
            {saleMutation.isPending ? 'Processing…' : 'Complete Sale'}
          </button>
        </div>
      </div>

      {/* Returns Modal */}
      <Modal open={showReturn} onClose={() => { setShowReturn(false); setReturnOrder(null); setReturnItems([]) }} title="Process Return" size="lg">
        {!returnOrder ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search POS Order</label>
              <input value={returnSearch} onChange={e => { setReturnSearch(e.target.value); searchReturns(e.target.value) }}
                className="form-input" placeholder="Order number or customer phone…" />
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {returnOrders.map(o => (
                <button key={o.id} onClick={() => selectReturnOrder(o)}
                  className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm transition-colors flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{o.orderNumber}</p>
                    <p className="text-gray-500 text-xs">{o.customerName} · {formatCurrency(o.total)}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
              ))}
              {returnSearch && returnOrders.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No POS orders found</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-sm">
              <p className="font-semibold">{returnOrder.orderNumber} · {returnOrder.customerName}</p>
              <p className="text-gray-500 text-xs">Total: {formatCurrency(returnOrder.total)}</p>
            </div>
            <div className="space-y-2">
              {returnItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.productName}</p>
                    <p className="text-xs text-gray-400">{item.sku} · Ordered: {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Return:</span>
                    <input type="number" min="0" max={item.quantity} value={item.returnQty}
                      onChange={e => setReturnItems(returnItems.map((it, i) => i === idx ? { ...it, returnQty: Math.min(Number(e.target.value), it.quantity) } : it))}
                      className="w-16 border rounded-lg px-2 py-1 text-center text-sm" />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => returnMutation.mutate()} disabled={returnMutation.isPending || returnItems.every(i => i.returnQty === 0)}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50">
                {returnMutation.isPending ? 'Processing…' : 'Process Return'}
              </button>
              <button onClick={() => setReturnOrder(null)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition-colors">Back</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Close Session Modal */}
      <Modal open={showClose} onClose={() => setShowClose(false)} title="Close POS Session" size="sm">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500">Opening Cash</p>
              <p className="font-bold text-gray-900 text-lg">{formatCurrency(session.openingCash)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500">Total Sales</p>
              <p className="font-bold text-primary-700 text-lg">{formatCurrency(session.totalSales)}</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Actual Closing Cash (LKR) *</label>
            <input type="number" value={closingCash} onChange={e => setClosingCash(e.target.value)} className="form-input text-lg font-semibold" placeholder="0.00" />
          </div>
          {closingCash !== '' && (
            <div className={`p-3 rounded-xl text-sm font-medium ${Number(closingCash) >= session.openingCash + session.totalSales ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {Number(closingCash) >= session.openingCash ? 'Balance OK' : `Short by ${formatCurrency(Math.abs(Number(closingCash) - (session.openingCash + session.totalSales)))}`}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending || !closingCash}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50">
              {closeMutation.isPending ? 'Closing…' : 'Close Session'}
            </button>
            <button onClick={() => setShowClose(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ===== Main Export =====
export default function POS() {
  return <SessionGuard>{({ session }) => <PosCounter session={session} />}</SessionGuard>
}
