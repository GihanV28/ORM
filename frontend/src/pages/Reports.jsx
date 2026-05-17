import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { formatCurrency, formatDate } from '../lib/utils'
import Badge from '../components/ui/Badge'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import DataTable from '../components/ui/DataTable'
import Spinner from '../components/ui/Spinner'
import { TrendingUp, DollarSign, Package, Users, MapPin, ShoppingCart, BarChart2, UserCheck, AlertTriangle, Download } from 'lucide-react'

const today = new Date()
const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
const defaultTo = today.toISOString().split('T')[0]

const TABS = [
  { key: 'sales', label: 'Sales', icon: TrendingUp },
  { key: 'profits', label: 'Profit', icon: DollarSign },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'customers', label: 'Customers', icon: Users },
  { key: 'geographic', label: 'Geographic', icon: MapPin },
  { key: 'status', label: 'Order Status', icon: ShoppingCart },
  { key: 'cogs', label: 'COGS', icon: BarChart2 },
  { key: 'employee', label: 'Employee', icon: UserCheck },
  { key: 'outstanding', label: 'Outstanding', icon: AlertTriangle },
  { key: 'expenses', label: 'Expenses', icon: DollarSign },
]

export default function Reports() {
  const [tab, setTab] = useState('sales')
  const [dateRange, setDateRange] = useState({ from: defaultFrom, to: defaultTo })
  const [applied, setApplied] = useState({ from: defaultFrom, to: defaultTo })

  const params = applied

  const { data: salesData, isLoading: salesLoading } = useQuery({ queryKey: ['report-sales', params], queryFn: () => api.get('/reports', { params }).then(r => r.data.data) })
  const { data: profitData, isLoading: profitLoading } = useQuery({ queryKey: ['report-profits', params], queryFn: () => api.get('/reports/profits', { params }).then(r => r.data.data), enabled: tab === 'profits' })
  const { data: productData, isLoading: productLoading } = useQuery({ queryKey: ['report-products', params], queryFn: () => api.get('/reports/products', { params }).then(r => r.data.data), enabled: tab === 'products' })
  const { data: customerData, isLoading: customerLoading } = useQuery({ queryKey: ['report-customers', params], queryFn: () => api.get('/reports/customers', { params }).then(r => r.data.data), enabled: tab === 'customers' })
  const { data: geoData, isLoading: geoLoading } = useQuery({ queryKey: ['report-geo', params], queryFn: () => api.get('/reports/geographic', { params }).then(r => r.data.data), enabled: tab === 'geographic' })
  const { data: cogsData, isLoading: cogsLoading } = useQuery({ queryKey: ['report-cogs', params], queryFn: () => api.get('/reports/cogs', { params }).then(r => r.data.data), enabled: tab === 'cogs' })
  const { data: empData, isLoading: empLoading } = useQuery({ queryKey: ['report-employee', params], queryFn: () => api.get('/reports/employee-performance', { params }).then(r => r.data.data), enabled: tab === 'employee' })
  const { data: custOutData } = useQuery({ queryKey: ['report-outstanding-customers'], queryFn: () => api.get('/reports/outstanding/customers').then(r => r.data.data), enabled: tab === 'outstanding' })
  const { data: suppOutData } = useQuery({ queryKey: ['report-outstanding-suppliers'], queryFn: () => api.get('/reports/outstanding/suppliers').then(r => r.data.data), enabled: tab === 'outstanding' })
  const { data: expData } = useQuery({ queryKey: ['expenses-report'], queryFn: () => api.get('/expenses', { params: { limit: 200 } }).then(r => r.data.data), enabled: tab === 'expenses' })

  const s = salesData?.summary || {}

  const exportCSV = (rows, filename) => {
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click()
  }

  return (
    <div className="p-6 space-y-5">
      <PageHeader icon={TrendingUp} title="Reports & Analytics" subtitle="Business performance insights across all modules"
        gradient="from-primary-600 to-indigo-700"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" value={dateRange.from} max={dateRange.to} onChange={e => setDateRange(d => ({ ...d, from: e.target.value }))}
              className="bg-white/20 text-white rounded-xl px-3 py-2 text-sm border border-white/30 outline-none" />
            <span className="text-white/70 text-sm">to</span>
            <input type="date" value={dateRange.to} min={dateRange.from} onChange={e => setDateRange(d => ({ ...d, to: e.target.value }))}
              className="bg-white/20 text-white rounded-xl px-3 py-2 text-sm border border-white/30 outline-none" />
            <button onClick={() => setApplied(dateRange)} className="bg-white text-primary-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/90 transition-colors">Apply</button>
          </div>
        }
      />

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingCart} label="Total Orders" value={s.totalOrders ?? 0} color="primary" />
        <StatCard icon={DollarSign} label="Revenue" value={formatCurrency(s.totalRevenue)} color="green" />
        <StatCard icon={TrendingUp} label="Net Profit" value={formatCurrency(s.totalProfit)} color="emerald" />
        <StatCard icon={BarChart2} label="Avg Order" value={formatCurrency(s.avgOrderValue)} color="blue" />
      </div>

      {/* Tab navigation */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-2">
        <div className="flex gap-1 flex-wrap">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${tab === key ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {salesLoading && <div className="flex justify-center py-8"><Spinner size="lg" /></div>}

      {/* SALES */}
      {tab === 'sales' && !salesLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Revenue Summary</h3>
            <div className="space-y-2">
              {[['Total Orders', s.totalOrders, ''],['Revenue', formatCurrency(s.totalRevenue), 'text-green-700'],['Profit', formatCurrency(s.totalProfit), 'text-emerald-700'],['Avg Order Value', formatCurrency(s.avgOrderValue), 'text-primary-700']].map(([label, val, cls]) => (
                <div key={label} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className={`font-semibold ${cls}`}>{val}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Status Breakdown</h3>
            {(salesData?.statusBreakdown || []).map(row => (
              <div key={row._id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <Badge status={row._id} />
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-500">{row.count}</span>
                  <span className="font-semibold">{formatCurrency(row.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between"><h3 className="font-semibold text-gray-900">Top Products</h3></div>
            <DataTable columns={[
              { key: 'productName', label: 'Product', render: r => <div><p className="font-medium">{r.productName}</p><p className="text-xs text-gray-400">{r.sku}</p></div> },
              { key: 'totalQuantity', label: 'Units', render: r => <span className="font-bold text-primary-600">{r.totalQuantity}</span> },
              { key: 'totalRevenue', label: 'Revenue', render: r => <span className="font-semibold">{formatCurrency(r.totalRevenue)}</span> },
            ]} data={salesData?.topProducts || []} emptyMessage="No product data." />
          </div>
        </div>
      )}

      {/* PROFITS */}
      {tab === 'profits' && (
        profitLoading ? <div className="flex justify-center py-8"><Spinner size="lg" /></div> : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[['Revenue', profitData?.summary?.totalRevenue, 'blue'],['Gross Profit', profitData?.summary?.grossProfit, 'green'],['Expenses', profitData?.summary?.totalExpenses, 'red'],['Net Profit', profitData?.summary?.netProfit, 'emerald']].map(([label, val, color]) => (
                <StatCard key={label} icon={DollarSign} label={label} value={formatCurrency(val)} color={color} />
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-500">Profit Margin</p>
                <span className="text-2xl font-bold text-primary-700">{profitData?.summary?.profitMargin}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3"><div className="bg-gradient-to-r from-primary-500 to-green-500 h-3 rounded-full" style={{ width: `${Math.min(profitData?.summary?.profitMargin || 0, 100)}%` }} /></div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Profit by Product</h3></div>
              <DataTable columns={[
                { key: 'productName', label: 'Product' },
                { key: 'qty', label: 'Units', render: r => r.qty },
                { key: 'revenue', label: 'Revenue', render: r => formatCurrency(r.revenue) },
                { key: 'cost', label: 'Cost', render: r => formatCurrency(r.cost) },
                { key: 'profit', label: 'Profit', render: r => <span className="font-bold text-green-700">{formatCurrency(r.profit)}</span> },
              ]} data={profitData?.topProducts || []} emptyMessage="No data." />
            </div>
          </div>
        )
      )}

      {/* PRODUCTS */}
      {tab === 'products' && (
        productLoading ? <div className="flex justify-center py-8"><Spinner size="lg" /></div> : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Top by Revenue</h3></div>
              <DataTable columns={[
                { key: 'productName', label: 'Product', render: r => <div><p className="font-medium">{r.productName}</p><p className="text-xs text-gray-400">{r.sku}</p></div> },
                { key: 'revenue', label: 'Revenue', render: r => <span className="font-semibold text-primary-700">{formatCurrency(r.revenue)}</span> },
              ]} data={productData?.byRevenue || []} emptyMessage="No data." />
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Top by Units Sold</h3></div>
              <DataTable columns={[
                { key: 'productName', label: 'Product' },
                { key: 'qty', label: 'Units', render: r => <span className="font-bold text-green-700">{r.qty}</span> },
              ]} data={productData?.byUnits || []} emptyMessage="No data." />
            </div>
            <div className="grid grid-cols-3 gap-3 lg:col-span-2">
              <StatCard icon={Package} label="Total Products" value={productData?.stockStats?.totalProducts ?? 0} color="primary" />
              <StatCard icon={AlertTriangle} label="Low Stock" value={productData?.stockStats?.lowStock ?? 0} color="amber" />
              <StatCard icon={Package} label="Out of Stock" value={productData?.stockStats?.outOfStock ?? 0} color="red" />
            </div>
          </div>
        )
      )}

      {/* CUSTOMERS */}
      {tab === 'customers' && (
        customerLoading ? <div className="flex justify-center py-8"><Spinner size="lg" /></div> : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Total Customers" value={customerData?.stats?.totalCustomers ?? 0} color="primary" />
              <StatCard icon={Users} label="New in Period" value={customerData?.stats?.newCustomers ?? 0} color="green" />
              <StatCard icon={Users} label="Repeat Customers" value={customerData?.stats?.repeatCustomers ?? 0} color="blue" />
              <StatCard icon={TrendingUp} label="Repeat Rate" value={`${customerData?.stats?.repeatRate}%`} color="purple" />
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Top Customers by Spending</h3></div>
              <DataTable columns={[
                { key: 'name', label: 'Customer', render: r => <div><p className="font-medium">{r.name}</p><p className="text-xs text-gray-400">{r.phone}</p></div> },
                { key: 'totalOrders', label: 'Orders' },
                { key: 'totalSpent', label: 'Total Spent', render: r => <span className="font-bold text-primary-700">{formatCurrency(r.totalSpent)}</span> },
                { key: 'creditBalance', label: 'Credit', render: r => r.creditBalance > 0 ? <span className="font-semibold text-orange-600">{formatCurrency(r.creditBalance)}</span> : '—' },
              ]} data={customerData?.topBySpend || []} emptyMessage="No customer data." />
            </div>
          </div>
        )
      )}

      {/* GEOGRAPHIC */}
      {tab === 'geographic' && (
        geoLoading ? <div className="flex justify-center py-8"><Spinner size="lg" /></div> : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">By District</h3></div>
              <DataTable columns={[
                { key: 'district', label: 'District', render: r => <span className="font-medium">{r.district || '—'}</span> },
                { key: 'orders', label: 'Orders', render: r => <span className="font-bold text-primary-600">{r.orders}</span> },
                { key: 'revenue', label: 'Revenue', render: r => formatCurrency(r.revenue) },
              ]} data={geoData?.byDistrict || []} emptyMessage="No data." />
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Top Cities</h3></div>
              <DataTable columns={[
                { key: 'city', label: 'City', render: r => <span className="font-medium">{r.city || '—'}</span> },
                { key: 'orders', label: 'Orders', render: r => <span className="font-bold text-green-700">{r.orders}</span> },
                { key: 'revenue', label: 'Revenue', render: r => formatCurrency(r.revenue) },
              ]} data={geoData?.byCity || []} emptyMessage="No data." />
            </div>
          </div>
        )
      )}

      {/* STATUS */}
      {tab === 'status' && !salesLoading && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Orders by Status</h3></div>
          <DataTable columns={[
            { key: '_id', label: 'Status', render: r => <Badge status={r._id} /> },
            { key: 'count', label: 'Orders', render: r => <span className="font-bold text-gray-900">{r.count}</span> },
            { key: 'revenue', label: 'Revenue', render: r => <span className="font-semibold text-primary-700">{formatCurrency(r.revenue)}</span> },
          ]} data={salesData?.statusBreakdown || []} emptyMessage="No data." />
        </div>
      )}

      {/* COGS */}
      {tab === 'cogs' && (
        cogsLoading ? <div className="flex justify-center py-8"><Spinner size="lg" /></div> : (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[['Total Units', cogsData?.totals?.qty, 'primary'],['Revenue', formatCurrency(cogsData?.totals?.revenue), 'green'],['COGS', formatCurrency(cogsData?.totals?.cost), 'red'],['Gross Profit', formatCurrency(cogsData?.totals?.profit), 'emerald']].map(([label, val, color]) => (
                <StatCard key={label} icon={DollarSign} label={label} value={val} color={color} />
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Cost of Goods Sold</h3>
                <button onClick={() => exportCSV(['Product,SKU,Qty,Revenue,Cost,Profit', ...(cogsData?.rows || []).map(r => `"${r.productName}","${r.sku}",${r.qty},${r.revenue},${r.cost},${r.profit}`)], 'cogs-report.csv')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5"><Download size={13} /> Export</button>
              </div>
              <DataTable columns={[
                { key: 'productName', label: 'Product', render: r => <div><p className="font-medium">{r.productName}</p><p className="text-xs text-gray-400">{r.sku}</p></div> },
                { key: 'qty', label: 'Units' },
                { key: 'revenue', label: 'Revenue', render: r => formatCurrency(r.revenue) },
                { key: 'cost', label: 'Cost', render: r => <span className="text-red-600">{formatCurrency(r.cost)}</span> },
                { key: 'profit', label: 'Profit', render: r => <span className="font-bold text-green-700">{formatCurrency(r.profit)}</span> },
              ]} data={cogsData?.rows || []} emptyMessage="No data." />
            </div>
          </div>
        )
      )}

      {/* EMPLOYEE PERFORMANCE */}
      {tab === 'employee' && (
        empLoading ? <div className="flex justify-center py-8"><Spinner size="lg" /></div> : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Employee Performance</h3></div>
            <DataTable columns={[
              { key: 'employee', label: 'Employee', render: r => <div><p className="font-medium">{r.employee?.name}</p><p className="text-xs text-gray-400">{r.employee?.role}</p></div> },
              { key: 'totalOrders', label: 'Orders', render: r => <span className="font-bold text-primary-600">{r.totalOrders}</span> },
              { key: 'returned', label: 'Returned', render: r => <span className="text-red-500">{r.returned}</span> },
              { key: 'revenue', label: 'Revenue', render: r => formatCurrency(r.revenue) },
              { key: 'profit', label: 'Profit', render: r => <span className="font-semibold text-green-700">{formatCurrency(r.profit)}</span> },
              { key: 'successRate', label: 'Success Rate', render: r => <span className={`font-bold ${Number(r.successRate) >= 80 ? 'text-green-600' : 'text-amber-600'}`}>{r.successRate}%</span> },
            ]} data={empData?.employees || []} emptyMessage="No employee performance data. Assign employees to orders to track performance." />
          </div>
        )
      )}

      {/* OUTSTANDING */}
      {tab === 'outstanding' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={AlertTriangle} label="Customer Outstanding" value={formatCurrency(custOutData?.totalUnpaid)} color="orange" />
            <StatCard icon={AlertTriangle} label="Credit Outstanding" value={formatCurrency(custOutData?.totalCredit)} color="red" />
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Unpaid Orders</h3></div>
            <DataTable columns={[
              { key: 'orderNumber', label: 'Order #', render: r => <span className="font-mono text-xs text-primary-700">{r.orderNumber}</span> },
              { key: 'customerName', label: 'Customer' },
              { key: 'customerPhone', label: 'Phone' },
              { key: 'total', label: 'Amount', render: r => <span className="font-bold text-gray-900">{formatCurrency(r.total)}</span> },
              { key: 'paymentStatus', label: 'Status', render: r => <Badge status={r.paymentStatus} /> },
            ]} data={custOutData?.unpaid || []} emptyMessage="No outstanding orders." />
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Customer Credit Balances</h3></div>
            <DataTable columns={[
              { key: 'name', label: 'Customer', render: r => <div><p className="font-medium">{r.name}</p><p className="text-xs text-gray-400">{r.phone}</p></div> },
              { key: 'creditBalance', label: 'Outstanding Balance', render: r => <span className="font-bold text-orange-600">{formatCurrency(r.creditBalance)}</span> },
              { key: 'totalOrders', label: 'Orders' },
            ]} data={custOutData?.creditCustomers || []} emptyMessage="No credit outstanding." />
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Supplier Outstanding Balances</h3></div>
            <DataTable columns={[
              { key: 'name', label: 'Supplier' },
              { key: 'totalOwed', label: 'Total Owed', render: r => formatCurrency(r.totalOwed) },
              { key: 'totalPaid', label: 'Paid', render: r => formatCurrency(r.totalPaid) },
              { key: 'balance', label: 'Outstanding', render: r => <span className="font-bold text-red-600">{formatCurrency(r.balance)}</span> },
            ]} data={suppOutData?.suppliers || []} emptyMessage="No supplier outstanding." />
          </div>
        </div>
      )}

      {/* EXPENSES */}
      {tab === 'expenses' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={DollarSign} label="Total Expenses" value={formatCurrency((expData?.expenses || []).reduce((s, e) => s + e.amount, 0))} color="red" />
            <StatCard icon={DollarSign} label="Revenue" value={formatCurrency(s.totalRevenue)} color="green" />
            <StatCard icon={TrendingUp} label="Net (Revenue - Expenses)" value={formatCurrency(s.totalRevenue - (expData?.expenses || []).reduce((s, e) => s + e.amount, 0))} color="primary" />
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Expenses by Category</h3>
            {Object.entries((expData?.expenses || []).reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc }, {})).sort(([,a],[,b]) => b - a).map(([cat, amount]) => (
              <div key={cat} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm font-medium text-gray-700">{cat}</span>
                <span className="font-semibold text-red-600">{formatCurrency(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
