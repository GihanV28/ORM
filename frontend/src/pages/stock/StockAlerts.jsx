import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { formatCurrency } from '../../lib/utils'
import PageHeader from '../../components/ui/PageHeader'
import DataTable from '../../components/ui/DataTable'
import StatCard from '../../components/ui/StatCard'
import { AlertTriangle, Package, XCircle } from 'lucide-react'

export default function StockAlerts() {
  const { data, isLoading } = useQuery({ queryKey: ['stock-alerts'], queryFn: () => api.get('/stock').then(r => r.data.data) })

  const allStock = data?.stock || []
  const summary = data?.summary || {}

  const lowStock = allStock.filter(s => s.quantity > 0 && s.quantity <= (s.product?.minStock || 5))
  const outOfStock = allStock.filter(s => s.quantity <= 0)

  const lowColumns = [
    { key: 'product', label: 'Product', render: r => (
      <div>
        <p className="font-medium text-gray-900">{r.product?.name}</p>
        <p className="text-xs text-gray-400">{r.product?.itemCode}</p>
      </div>
    )},
    { key: 'quantity', label: 'Current Stock', render: r => <span className="font-bold text-amber-600 text-lg">{r.quantity}</span> },
    { key: 'minStock', label: 'Min Stock', render: r => r.product?.minStock || 5 },
    { key: 'gap', label: 'Need to Order', render: r => <span className="font-semibold text-red-600">{Math.max(0, (r.product?.minStock || 5) - r.quantity)}</span> },
    { key: 'status', label: '', render: r => <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><AlertTriangle size={10} className="mr-1" /> Low Stock</span> },
  ]

  const outColumns = [
    { key: 'product', label: 'Product', render: r => (
      <div>
        <p className="font-medium text-gray-900">{r.product?.name}</p>
        <p className="text-xs text-gray-400">{r.product?.itemCode}</p>
      </div>
    )},
    { key: 'quantity', label: 'Stock', render: () => <span className="font-bold text-red-600 text-lg">0</span> },
    { key: 'status', label: '', render: () => <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700"><XCircle size={10} className="mr-1" /> Out of Stock</span> },
  ]

  return (
    <div className="p-6 space-y-6">
      <PageHeader icon={AlertTriangle} title="Stock Alerts" subtitle="Products that need immediate restocking attention"
        gradient="from-red-600 to-rose-700" />

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Package} label="Total Products" value={summary.totalProducts || 0} color="primary" />
        <StatCard icon={AlertTriangle} label="Low Stock Items" value={lowStock.length} color="amber" />
        <StatCard icon={XCircle} label="Out of Stock" value={outOfStock.length} color="red" />
      </div>

      <div>
        <h2 className="font-semibold text-amber-700 mb-3 flex items-center gap-2"><AlertTriangle size={16} /> Low Stock ({lowStock.length})</h2>
        <DataTable columns={lowColumns} data={lowStock} loading={isLoading} emptyMessage="No low stock items. All products are well stocked!" />
      </div>

      {outOfStock.length > 0 && (
        <div>
          <h2 className="font-semibold text-red-600 mb-3 flex items-center gap-2"><XCircle size={16} /> Out of Stock ({outOfStock.length})</h2>
          <DataTable columns={outColumns} data={outOfStock} emptyMessage="" />
        </div>
      )}
    </div>
  )
}
