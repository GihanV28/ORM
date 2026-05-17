import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { formatCurrency, formatDate, ORDER_STATUSES } from '../../lib/utils'
import Spinner from '../../components/ui/Spinner'
import { Printer, ChevronLeft, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import JsBarcode from 'jsbarcode'

function Barcode({ value, width = 1.5, height = 40 }) {
  const svgRef = useRef(null)
  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128', width, height,
          displayValue: true, fontSize: 10, margin: 2,
          background: 'transparent',
        })
      } catch {}
    }
  }, [value, width, height])
  return <svg ref={svgRef} />
}

function WaybillCard({ order }) {
  return (
    <div className="waybill-card border-2 border-gray-800 p-3 flex flex-col gap-2" style={{ width: '13cm', height: '9.5cm', pageBreakInside: 'avoid' }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-400 pb-2">
        <div>
          <p className="font-bold text-sm leading-tight">Adum Culture</p>
          <p className="text-xs text-gray-500">Order Management System</p>
        </div>
        <div className="text-right">
          <p className="font-mono font-bold text-base">{order.orderNumber || order.id?.slice(-8).toUpperCase()}</p>
          <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
        </div>
      </div>

      {/* Barcode */}
      <div className="flex justify-center">
        <Barcode value={order.orderNumber || order.id?.slice(-12)} width={1.2} height={35} />
      </div>

      {/* Recipient */}
      <div className="border border-gray-300 rounded p-2 flex-1">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Deliver To</p>
        <p className="font-bold text-sm leading-snug">{order.customerName}</p>
        <p className="text-xs text-gray-700">{order.customerPhone}{order.alternativePhone ? ` / ${order.alternativePhone}` : ''}</p>
        <p className="text-xs text-gray-700 mt-0.5">{order.shippingAddress}{order.addressLine2 ? `, ${order.addressLine2}` : ''}</p>
        <p className="text-xs text-gray-700">{order.city}, {order.district} {order.postalCode || ''}</p>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-300">
        <div>
          <p className="text-xs text-gray-500">Payment</p>
          <p className="font-bold text-sm uppercase">{order.paymentMethod}</p>
        </div>
        {(order.paymentMethod === 'cod' || order.paymentMethod === 'cash') && (
          <div className="text-center">
            <p className="text-xs text-gray-500">COD Amount</p>
            <p className="font-bold text-base text-red-700">{formatCurrency(order.codAmount || order.total)}</p>
          </div>
        )}
        <div className="text-right">
          <p className="text-xs text-gray-500">Items</p>
          <p className="font-bold text-sm">{Array.isArray(order.items) ? order.items.reduce((s, i) => s + i.quantity, 0) : '—'}</p>
        </div>
        {order.deliveryCompany && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Courier</p>
            <p className="font-bold text-xs">{order.deliveryCompany}</p>
            {order.waybillNumber && <p className="font-mono text-xs text-primary-700">{order.waybillNumber}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default function PrintWaybills() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('confirm')
  const [selected, setSelected] = useState(new Set())
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['orders-waybill', { status, search, page }],
    queryFn: () => api.get('/orders', { params: { status, search, page, limit: 50 } }).then(r => r.data.data),
  })

  const orders = data?.orders || []
  const pagination = data?.pagination || {}

  const toggleSelect = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectAll = () => setSelected(new Set(orders.map(o => o.id)))
  const clearAll = () => setSelected(new Set())

  const selectedOrders = orders.filter(o => selected.has(o.id))

  const handlePrint = () => {
    if (!selectedOrders.length) return alert('Select at least one order to print.')
    window.print()
  }

  return (
    <div className="p-6">
      {/* Screen-only UI */}
      <div className="no-print">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/orders" className="text-gray-500 hover:text-gray-700"><ChevronLeft size={20} /></Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Print Waybills</h1>
            <p className="text-sm text-gray-500 mt-0.5">Select orders then print — 4 waybills per A4 sheet</p>
          </div>
          <button onClick={handlePrint} disabled={selected.size === 0}
            className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40 shadow-lg shadow-primary-500/25">
            <Printer size={16} /> Print {selected.size > 0 ? `${selected.size} Waybill${selected.size > 1 ? 's' : ''}` : 'Waybills'}
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5 flex flex-wrap gap-3 items-center shadow-sm">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-48">
            <Search size={15} className="text-gray-400" />
            <input placeholder="Search order #, customer…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="text-sm outline-none bg-transparent flex-1" />
          </div>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="form-select max-w-44">
            <option value="">All Statuses</option>
            {ORDER_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={selectAll} className="px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-xl border border-primary-200 transition-colors">Select All</button>
            <button onClick={clearAll} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors">Clear</button>
          </div>
        </div>

        {/* Order selection table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-12 px-4 py-3"><input type="checkbox" checked={selected.size === orders.length && orders.length > 0} onChange={e => e.target.checked ? selectAll() : clearAll()} className="w-4 h-4 rounded" /></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Order #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">City</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">COD Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Waybill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={6} className="py-10 text-center"><Spinner className="mx-auto" /></td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-gray-400">No orders found</td></tr>
              ) : orders.map(order => (
                <tr key={order.id} onClick={() => toggleSelect(order.id)}
                  className={`cursor-pointer transition-colors ${selected.has(order.id) ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
                  <td className="px-4 py-3"><input type="checkbox" checked={selected.has(order.id)} onChange={() => {}} className="w-4 h-4 rounded" /></td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-primary-700">{order.orderNumber}</td>
                  <td className="px-4 py-3"><p className="font-medium">{order.customerName}</p><p className="text-xs text-gray-400">{order.customerPhone}</p></td>
                  <td className="px-4 py-3 text-gray-600">{order.city}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(order.codAmount || order.total)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{order.waybillNumber || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border rounded-lg disabled:opacity-40 text-sm">Prev</button>
            <span className="px-3 py-1.5 text-sm text-gray-500">Page {page} of {pagination.pages}</span>
            <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border rounded-lg disabled:opacity-40 text-sm">Next</button>
          </div>
        )}
      </div>

      {/* Print-only waybill grid — 4 per A4 */}
      <div className="print-only hidden print:block">
        <style>{`
          @media print {
            @page { size: A4; margin: 0.5cm; }
            body { font-family: Arial, sans-serif; }
            .waybill-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5cm; }
            .waybill-card { font-size: 11px; box-sizing: border-box; }
          }
        `}</style>
        <div className="waybill-grid">
          {selectedOrders.map(order => (
            <WaybillCard key={order.id} order={order} />
          ))}
        </div>
      </div>
    </div>
  )
}
