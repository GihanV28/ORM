import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { formatCurrency, formatDate } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import StatCard from '../components/ui/StatCard'
import { DollarSign, Plus, TrendingDown } from 'lucide-react'

const PAYMENT_METHODS = ['cash', 'bank_transfer', 'cheque', 'card']
const EMPTY = { supplierId: '', amount: '', paymentMethod: 'cash', reference: '', bankAccountId: '', notes: '', date: new Date().toISOString().split('T')[0] }

export default function SupplierPayments() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY)

  const { data, isLoading } = useQuery({ queryKey: ['supplier-payments'], queryFn: () => api.get('/supplier-payments').then(r => r.data.data) })
  const { data: suppliersData } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.get('/suppliers').then(r => r.data.data) })
  const { data: accountsData } = useQuery({ queryKey: ['bank-accounts'], queryFn: () => api.get('/bank-accounts').then(r => r.data.data) })

  const payments = data?.payments || []
  const suppliers = suppliersData?.suppliers || []
  const accounts = accountsData?.accounts || []

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)

  const saveMutation = useMutation({
    mutationFn: (d) => api.post('/supplier-payments', d),
    onSuccess: () => { qc.invalidateQueries(['supplier-payments']); qc.invalidateQueries(['suppliers']); setShowModal(false); setForm(EMPTY) }
  })
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const columns = [
    { key: 'date', label: 'Date', render: r => formatDate(r.date) },
    { key: 'supplier', label: 'Supplier', render: r => <span className="font-medium">{r.supplier?.name}</span> },
    { key: 'amount', label: 'Amount', render: r => <span className="font-semibold text-green-700">{formatCurrency(r.amount)}</span> },
    { key: 'paymentMethod', label: 'Method', render: r => <span className="capitalize">{r.paymentMethod.replace('_', ' ')}</span> },
    { key: 'bankAccount', label: 'Account', render: r => r.bankAccount ? `${r.bankAccount.name}` : '—' },
    { key: 'reference', label: 'Reference' },
  ]

  return (
    <div className="p-6">
      <PageHeader icon={DollarSign} title="Supplier Payments" subtitle="Track payments made to suppliers"
        gradient="from-emerald-600 to-green-700"
        actions={
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus size={16} /> Record Payment
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={DollarSign} label="Total Payments Made" value={formatCurrency(totalPaid)} color="emerald" />
        <StatCard icon={TrendingDown} label="Suppliers with Balance" value={suppliers.filter(s => s.totalOwed > s.totalPaid).length} color="amber" />
      </div>

      <DataTable columns={columns} data={payments} loading={isLoading} emptyMessage="No supplier payments recorded." />

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Record Supplier Payment">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
            <select value={form.supplierId} onChange={e => f('supplierId', e.target.value)} className="form-select">
              <option value="">Select supplier</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (LKR) *</label>
              <input type="number" value={form.amount} onChange={e => f('amount', e.target.value)} className="form-input" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => f('date', e.target.value)} className="form-input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select value={form.paymentMethod} onChange={e => f('paymentMethod', e.target.value)} className="form-select">
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deduct from Account</label>
              <select value={form.bankAccountId} onChange={e => f('bankAccountId', e.target.value)} className="form-select">
                <option value="">None (cash)</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} — {formatCurrency(a.balance)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference / Receipt #</label>
            <input value={form.reference} onChange={e => f('reference', e.target.value)} className="form-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2} className="form-textarea" />
          </div>
          {saveMutation.isError && <p className="text-red-500 text-sm">{saveMutation.error?.response?.data?.message}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={() => saveMutation.mutate({ ...form, amount: Number(form.amount) })} disabled={saveMutation.isPending || !form.supplierId || !form.amount}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50">
              {saveMutation.isPending ? 'Saving…' : 'Record Payment'}
            </button>
            <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
