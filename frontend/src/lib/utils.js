export const formatCurrency = (amount, currency = 'LKR') =>
  new Intl.NumberFormat('en-LK', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount ?? 0)

export const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

export const formatDateTime = (date) =>
  date ? new Date(date).toLocaleString('en-LK', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export const statusColors = {
  // Order statuses
  open: 'bg-blue-100 text-blue-800',
  no_answer: 'bg-gray-100 text-gray-700',
  on_hold: 'bg-yellow-100 text-yellow-800',
  confirm: 'bg-indigo-100 text-indigo-800',
  dispatched: 'bg-purple-100 text-purple-800',
  shipped: 'bg-cyan-100 text-cyan-800',
  delivered: 'bg-green-100 text-green-800',
  returned: 'bg-orange-100 text-orange-800',
  refunded: 'bg-pink-100 text-pink-800',
  damaged: 'bg-red-100 text-red-800',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-900',
  // Payment statuses
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  partially_paid: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
  cod: 'bg-gray-100 text-gray-700',
  // Generic
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-600',
  draft: 'bg-yellow-100 text-yellow-800',
}

export const ORDER_STATUSES = [
  'open','no_answer','on_hold','confirm','dispatched','shipped','delivered','returned','refunded','damaged','cancelled','completed'
]

export const PAYMENT_METHODS = ['cod','cash','bank_transfer','card','online','credit']
export const PAYMENT_STATUSES = ['pending','paid','partially_paid','refunded','failed','cod']
export const DISTRICTS = [
  'Colombo','Gampaha','Kalutara','Kandy','Matale','Nuwara Eliya','Galle','Matara','Hambantota',
  'Jaffna','Kilinochchi','Mannar','Mullaitivu','Vavuniya','Puttalam','Kurunegala','Anuradhapura',
  'Polonnaruwa','Badulla','Monaragala','Ratnapura','Kegalle','Trincomalee','Batticaloa','Ampara'
]
