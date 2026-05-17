import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { formatCurrency, formatDate } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import StatCard from '../components/ui/StatCard'
import { CreditCard, Plus, Search, X, AlertTriangle } from 'lucide-react'

export default function Credit() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [showAddCredit, setShowAddCredit] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [creditForm, setCreditForm] = useState({ amount: '', orderId: '', notes: '' })
  const [paymentForm, setPaymentForm] = useState({ amount: '', notes: '' })

  const { data, isLoading } = useQuery({ queryKey: ['credit'], queryFn: () => api.get('/credit').then(r => r.data.data) })
  const { data: customerData } = useQuery({
    queryKey: ['credit-customer', selected?.id],
    queryFn: () => selected ? api.get(`/credit/customer/${selected.id}`).then(r => r.data.data) : null,
    enabled: !!selected,
  })

  const customers = data?.customers || []
  const totalOutstanding = data?.totalOutstanding || 0

  const addCreditMutation = useMutation({
    mutationFn: (d) => api.post('/credit/add', { ...d, customerId: selected.id, amount: Number(d.amount) }),
    onSuccess: () => { qc.invalidateQueries(['credit']); qc.invalidateQueries(['credit-customer', selected.id]); setShowAddCredit(false); setCreditForm({ amount: '', orderId: '', notes: '' }) }
  })
  const paymentMutation = useMutation({
    mutationFn: (d) => api.post('/credit/payment', { ...d, customerId: selected.id, amount: Number(d.amount) }),
    onSuccess: () => { qc.invalidateQueries(['credit']); qc.invalidateQueries(['credit-customer', selected.id]); setShowPayment(false); setPaymentForm({ amount: '', notes: '' }) }
  })

  const columns = [
    { key: 'name', label: 'Customer', render: r => <button onClick={() => setSelected(r)} className="font-medium text-primary-700 hover:underline">{r.name}</button> },
    { key: 'phone', label: 'Phone' },
    { key: 'totalOrders', label: 'Orders' },
    { key: 'creditBalance', label: 'Outstanding Balance', render: r => <span className="font-bold text-orange-600">{formatCurrency(r.creditBalance)}</span> },
  ]

  const creditHistory = customerData?.credits || []
  const creditColumns = [
    { key: 'createdAt', label: 'Date', render: r => formatDate(r.createdAt) },
    { key: 'type', label: 'Type', render: r => <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${r.type === 'credit' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{r.type}</span> },
    { key: 'amount', label: 'Amount', render: r => <span className={`font-semibold ${r.type === 'credit' ? 'text-orange-600' : 'text-green-600'}`}>{r.type === 'credit' ? '+' : '-'}{formatCurrency(r.amount)}</span> },
    { key: 'balanceAfter', label: 'Balance After', render: r => formatCurrency(r.balanceAfter) },
    { key: 'notes', label: 'Notes', render: r => <span className="text-gray-500 text-xs">{r.notes || '—'}</span> },
  ]

  return (
    <div className="p-6">
      <PageHeader icon={CreditCard} title="Credit Management" subtitle="Track customer credit balances and payments"
        gradient="from-orange-500 to-amber-600" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard icon={CreditCard} label="Total Outstanding" value={formatCurrency(totalOutstanding)} color="orange" />
        <StatCard icon={AlertTriangle} label="Customers with Balance" value={customers.length} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold text-gray-800 mb-3">Customers with Outstanding Credit</h2>
          <DataTable columns={columns} data={customers} loading={isLoading} emptyMessage="No outstanding credit balances." />
        </div>

        {selected && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900">{customerData?.customer?.name || selected.name}</h2>
                <p className="text-sm text-gray-500">{selected.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Outstanding</p>
                  <p className="text-lg font-bold text-orange-600">{formatCurrency(customerData?.customer?.creditBalance || selected.creditBalance)}</p>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"><X size={16} /></button>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <button onClick={() => setShowAddCredit(true)} className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2 text-sm font-medium transition-colors">
                <Plus size={14} /> Add Credit
              </button>
              <button onClick={() => setShowPayment(true)} className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2 text-sm font-medium transition-colors">
                <CreditCard size={14} /> Record Payment
              </button>
            </div>

            <DataTable columns={creditColumns} data={creditHistory} emptyMessage="No credit history." />
          </div>
        )}
      </div>

      {/* Add Credit Modal */}
      <Modal open={showAddCredit} onClose={() => setShowAddCredit(false)} title={`Add Credit — ${selected?.name}`} size="sm">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (LKR) *</label>
            <input type="number" value={creditForm.amount} onChange={e => setCreditForm(f => ({ ...f, amount: e.target.value }))} className="form-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={creditForm.notes} onChange={e => setCreditForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="form-textarea" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => addCreditMutation.mutate(creditForm)} disabled={addCreditMutation.isPending || !creditForm.amount}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50 transition-colors">
              {addCreditMutation.isPending ? 'Saving…' : 'Add Credit'}
            </button>
            <button onClick={() => setShowAddCredit(false)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Record Payment Modal */}
      <Modal open={showPayment} onClose={() => setShowPayment(false)} title={`Record Payment — ${selected?.name}`} size="sm">
        <div className="space-y-3">
          <div className="p-3 bg-orange-50 rounded-xl border border-orange-200 text-sm">
            Outstanding balance: <strong className="text-orange-700">{formatCurrency(customerData?.customer?.creditBalance || 0)}</strong>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount (LKR) *</label>
            <input type="number" max={customerData?.customer?.creditBalance} value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} className="form-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="form-textarea" />
          </div>
          {paymentMutation.isError && <p className="text-red-500 text-sm">{paymentMutation.error?.response?.data?.message}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={() => paymentMutation.mutate(paymentForm)} disabled={paymentMutation.isPending || !paymentForm.amount}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50 transition-colors">
              {paymentMutation.isPending ? 'Saving…' : 'Record Payment'}
            </button>
            <button onClick={() => setShowPayment(false)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
