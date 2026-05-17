const STATUS_STYLES = {
  // Order
  open: 'bg-blue-100 text-blue-700',
  no_answer: 'bg-gray-100 text-gray-600',
  on_hold: 'bg-amber-100 text-amber-700',
  confirm: 'bg-indigo-100 text-indigo-700',
  dispatched: 'bg-purple-100 text-purple-700',
  shipped: 'bg-cyan-100 text-cyan-700',
  delivered: 'bg-green-100 text-green-700',
  returned: 'bg-orange-100 text-orange-700',
  refunded: 'bg-pink-100 text-pink-700',
  damaged: 'bg-red-100 text-red-700',
  cancelled: 'bg-red-100 text-red-600',
  completed: 'bg-emerald-100 text-emerald-700',
  // Payment
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  partially_paid: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-700',
  cod: 'bg-gray-100 text-gray-600',
  // General
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
  blacklisted: 'bg-red-100 text-red-700',
  // GRN / PO
  received: 'bg-green-100 text-green-700',
  partially_received: 'bg-blue-100 text-blue-700',
  sent: 'bg-purple-100 text-purple-700',
  // SMS
  sending: 'bg-blue-100 text-blue-700',
  // Credit
  credit: 'bg-orange-100 text-orange-700',
  payment: 'bg-green-100 text-green-700',
}

export default function Badge({ status, label, className = '' }) {
  const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${style} ${className}`}>
      {label || status?.replace(/_/g, ' ')}
    </span>
  )
}
