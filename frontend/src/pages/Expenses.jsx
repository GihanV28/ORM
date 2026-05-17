import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { formatCurrency, formatDate } from '../lib/utils'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import { Plus, Search } from 'lucide-react'

const EXPENSE_CATEGORIES = ['Rent','Utilities','Salaries','Marketing','Packaging','Shipping','Maintenance','Office','Other']
const EMPTY = { title: '', amount: '', category: 'Other', date: new Date().toISOString().split('T')[0], paymentMethod: 'cash', description: '', reference: '' }

export default function Expenses() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY)

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', search],
    queryFn: () => api.get('/expenses', { params: { search, limit: 50 } }).then(r => r.data.data),
  })

  const expenses = data?.expenses || []
  const summary = data?.summary || {}

  const saveMutation = useMutation({
    mutationFn: (d) => api.post('/expenses', { ...d, amount: Number(d.amount) }),
    onSuccess: () => { qc.invalidateQueries(['expenses']); setShowModal(false); setForm(EMPTY) }
  })

  const f = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const columns = [
    { key: 'date', label: 'Date', render: row => formatDate(row.date) },
    { key: 'title', label: 'Title', render: row => <div><p className="font-medium">{row.title}</p>{row.reference && <p className="text-xs text-gray-400">#{row.reference}</p>}</div> },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount', render: row => <span className="font-medium text-red-600">{formatCurrency(row.amount)}</span> },
    { key: 'paymentMethod', label: 'Payment', render: row => row.paymentMethod.replace(/_/g,' ') },
    { key: 'description', label: 'Note', render: row => <span className="text-gray-400 text-xs">{row.description || '—'}</span> },
  ]

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        <button onClick={() => { setForm(EMPTY); setShowModal(true) }}
          className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
          <Plus size={16} /> Add Expense
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">This Month</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(summary.thisMonth)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">This Year</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(summary.thisYear)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Records</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{data?.total ?? 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 max-w-sm">
          <Search size={16} className="text-gray-400" />
          <input placeholder="Search expenses..." className="text-sm outline-none flex-1" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <DataTable columns={columns} data={expenses} loading={isLoading} emptyMessage="No expenses recorded." />

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Expense">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Title*</label>
              <input value={form.title} onChange={e => f('title', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount (LKR)*</label>
              <input type="number" value={form.amount} onChange={e => f('amount', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date*</label>
              <input type="date" value={form.date} onChange={e => f('date', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select value={form.category} onChange={e => f('category', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
              <select value={form.paymentMethod} onChange={e => f('paymentMethod', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                {['cash','bank_transfer','card','cheque'].map(m => <option key={m} value={m}>{m.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reference #</label>
              <input value={form.reference} onChange={e => f('reference', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea value={form.description} onChange={e => f('description', e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.title || !form.amount}
              className="flex-1 bg-blue-700 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800 disabled:opacity-50">
              {saveMutation.isPending ? 'Saving...' : 'Add Expense'}
            </button>
            <button onClick={() => setShowModal(false)} className="flex-1 border rounded-lg py-2 text-sm">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
