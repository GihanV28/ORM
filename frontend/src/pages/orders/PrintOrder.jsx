import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import Spinner from '../../components/ui/Spinner'
import { Printer, ArrowLeft } from 'lucide-react'

export default function PrintOrder() {
  const { id } = useParams()

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.get(`/orders/${id}`).then(r => r.data.data.order),
  })

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data.data.user),
  })

  const businessName = settingsData?.businessName || 'Adum Culture'
  const phone = settingsData?.phone || ''
  const address = settingsData?.address || ''

  const handlePrint = () => window.print()

  if (isLoading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>
  if (!order) return <div className="p-6 text-gray-500">Order not found</div>

  const items = Array.isArray(order.items) ? order.items : []

  return (
    <div>
      {/* Screen controls */}
      <div className="no-print flex items-center gap-4 p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
        <Link to={`/orders/${id}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm">
          <ArrowLeft size={16} /> Back to Order
        </Link>
        <button onClick={handlePrint}
          className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-primary-500/25">
          <Printer size={16} /> Print Invoice
        </button>
      </div>

      {/* Invoice — visible on screen + print */}
      <div className="max-w-2xl mx-auto p-8 bg-white print:max-w-none print:mx-0 print:p-6">
        <style>{`@media print { @page { size: A4; margin: 1.5cm; } .no-print { display: none !important; } }`}</style>

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{businessName}</h1>
            {phone && <p className="text-sm text-gray-500 mt-1">{phone}</p>}
            {address && <p className="text-sm text-gray-500">{address}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary-700">INVOICE</p>
            <p className="font-mono font-semibold text-gray-700 mt-1">{order.orderNumber}</p>
            <p className="text-sm text-gray-500">{formatDateTime(order.createdAt)}</p>
          </div>
        </div>

        <div className="h-px bg-gray-200 mb-6" />

        {/* Bill To */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bill To</p>
          <p className="font-bold text-gray-900">{order.customerName}</p>
          <p className="text-sm text-gray-600">{order.customerPhone}{order.alternativePhone ? ` / ${order.alternativePhone}` : ''}</p>
          <p className="text-sm text-gray-600">{order.shippingAddress}{order.addressLine2 ? `, ${order.addressLine2}` : ''}</p>
          <p className="text-sm text-gray-600">{order.city}, {order.district} {order.postalCode || ''}</p>
        </div>

        {/* Items table */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="text-left py-2 text-xs font-bold uppercase text-gray-600">Product</th>
              <th className="text-center py-2 text-xs font-bold uppercase text-gray-600 w-16">Qty</th>
              <th className="text-right py-2 text-xs font-bold uppercase text-gray-600 w-28">Unit Price</th>
              <th className="text-right py-2 text-xs font-bold uppercase text-gray-600 w-28">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2.5">
                  <p className="font-medium text-gray-900">{item.productName}</p>
                  {item.sku && <p className="text-xs text-gray-400">SKU: {item.sku}</p>}
                </td>
                <td className="py-2.5 text-center font-medium">{item.quantity}</td>
                <td className="py-2.5 text-right text-gray-700">{formatCurrency(item.unitPrice)}</td>
                <td className="py-2.5 text-right font-semibold text-gray-900">
                  {formatCurrency((item.unitPrice * item.quantity) - (item.discount || 0))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.shippingCost > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Shipping</span><span>{formatCurrency(order.shippingCost)}</span>
              </div>
            )}
            {order.discount > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Discount</span><span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t border-gray-300 pt-2 mt-2">
              <span>Total</span><span className="text-primary-700">{formatCurrency(order.total)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mt-1">
              <span>Payment Method</span><span className="capitalize font-medium">{order.paymentMethod?.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Payment Status</span>
              <span className={`capitalize font-medium ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                {order.paymentStatus?.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Customer Note</p>
            <p className="text-sm text-gray-700">{order.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="h-px bg-gray-200 mt-6 mb-4" />
        <p className="text-center text-xs text-gray-400">Thank you for your order! · {businessName}</p>
      </div>
    </div>
  )
}
