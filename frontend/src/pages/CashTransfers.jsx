import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { formatCurrency, formatDate } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import { ArrowLeftRight, Plus } from 'lucide-react'

const TYPES = ['deposit', 'withdrawal', 'transfer']
const EMPTY = { type: 'transfer', fromAccountId: '', toAccountId: '', amount: '', reference: '', description: '', date: new Date().toISOString().split('T')[0] }

export default function CashTransfers() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY)

  const { data, isLoading } = useQuery({ queryKey: ['cash-transfers'], queryFn: () => api.get('/cash-transfers').then(r => r.data.data) })
  const { data: accountsData } = useQuery({ queryKey: ['bank-accounts'], queryFn: () => api.get('/bank-accounts').then(r => r.data.data) })

  const transfers = data?.transfers || []
  const accounts = accountsData?.accounts || []

  const saveMutation = useMutation({
    mutationFn: (d) => api.post('/cash-transfers', d),
    onSuccess: () => { qc.invalidateQueries(['cash-transfers']); qc.invalidateQueries(['bank-accounts']); setShowModal(false); setForm(EMPTY) }
  })
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const typeColors = { deposit: 'bg-green-100 text-green-700', withdrawal: 'bg-red-100 text-red-700', transfer: 'bg-blue-100 text-blue-700' }

  const columns = [
    { key: 'date', label: 'Date', render: r => formatDate(r.date) },
    { key: 'type', label: 'Type', render: r => <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${typeColors[r.type]}`}>{r.type}</span> },
    { key: 'from', label: 'From', render: r => r.fromAccount ? `${r.fromAccount.name} (${r.fromAccount.bankName})` : '—' },
    { key: 'to', label: 'To', render: r => r.toAccount ? `${r.toAccount.name} (${r.toAccount.bankName})` : '—' },
    { key: 'amount', label: 'Amount', render: r => <span className="font-semibold text-gray-900">{formatCurrency(r.amount)}</span> },
    { key: 'reference', label: 'Reference' },
    { key: 'description', label: 'Description', render: r => <span className="text-gray-500 text-xs">{r.description || '—'}</span> },
  ]

  return (
    <div className="p-6">
      <PageHeader icon={ArrowLeftRight} title="Cash Transfers" subtitle="Track deposits, withdrawals and transfers between accounts"
        gradient="from-violet-600 to-purple-700"
        actions={
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus size={16} /> New Transfer
          </button>
        }
      />

      <DataTable columns={columns} data={transfers} loading={isLoading} emptyMessage="No transfers recorded yet." />

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Cash Transfer">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Type *</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(t => (
                <button key={t} onClick={() => f('type', t)}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-colors capitalize ${form.type === t ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {(form.type === 'transfer' || form.type === 'withdrawal') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Account{form.type !== 'deposit' ? ' *' : ''}</label>
                <select value={form.fromAccountId} onChange={e => f('fromAccountId', e.target.value)} className="form-select">
                  <option value="">Select account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} — {formatCurrency(a.balance)}</option>)}
                </select>
              </div>
            )}
            {(form.type === 'transfer' || form.type === 'deposit') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Account *</label>
                <select value={form.toAccountId} onChange={e => f('toAccountId', e.target.value)} className="form-select">
                  <option value="">Select account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} — {formatCurrency(a.balance)}</option>)}
                </select>
              </div>
            )}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference #</label>
            <input value={form.reference} onChange={e => f('reference', e.target.value)} className="form-input" placeholder="Receipt / cheque number" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => f('description', e.target.value)} rows={2} className="form-textarea" placeholder="Optional notes..." />
          </div>
          {saveMutation.isError && <p className="text-red-500 text-sm">{saveMutation.error?.response?.data?.message}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={() => saveMutation.mutate({ ...form, amount: Number(form.amount) })} disabled={saveMutation.isPending || !form.amount}
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50">
              {saveMutation.isPending ? 'Saving…' : 'Record Transfer'}
            </button>
            <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
