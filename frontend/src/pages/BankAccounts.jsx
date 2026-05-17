import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { formatCurrency } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { Building2, Plus, Edit, Trash2, Star, CreditCard } from 'lucide-react'

const ACCOUNT_TYPES = ['savings', 'current', 'fixed_deposit']
const EMPTY = { name: '', bankName: '', accountNo: '', branch: '', accountType: 'savings', isDefault: false, notes: '' }

export default function BankAccounts() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)

  const { data, isLoading } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => api.get('/bank-accounts').then(r => r.data.data),
  })

  const accounts = data?.accounts || []
  const totalBalance = data?.totalBalance || 0

  const saveMutation = useMutation({
    mutationFn: (d) => editing ? api.put(`/bank-accounts/${editing.id}`, d) : api.post('/bank-accounts', d),
    onSuccess: () => { qc.invalidateQueries(['bank-accounts']); setShowModal(false); setEditing(null); setForm(EMPTY) }
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/bank-accounts/${id}`),
    onSuccess: () => qc.invalidateQueries(['bank-accounts'])
  })

  const openEdit = (a) => {
    setEditing(a)
    setForm({ name: a.name, bankName: a.bankName, accountNo: a.accountNo, branch: a.branch || '', accountType: a.accountType, isDefault: a.isDefault, notes: a.notes || '' })
    setShowModal(true)
  }
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="p-6">
      <PageHeader
        icon={Building2}
        title="Bank Accounts"
        subtitle="Manage your business bank accounts"
        gradient="from-blue-600 to-indigo-700"
        actions={
          <button onClick={() => { setEditing(null); setForm(EMPTY); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus size={16} /> Add Account
          </button>
        }
      />

      {/* Total Balance */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-5 text-white mb-6 shadow-lg shadow-primary-500/25">
        <p className="text-primary-100 text-sm font-medium">Total Balance Across All Accounts</p>
        <p className="text-3xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse h-48" />)}
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200">
          <EmptyState icon={Building2} title="No Bank Accounts Yet" description="Add your first bank account to start tracking balances."
            action={<button onClick={() => { setEditing(null); setForm(EMPTY); setShowModal(true) }} className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors"><Plus size={16} /> Add Bank Account</button>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(acc => (
            <div key={acc.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Building2 size={22} className="text-blue-600" />
                </div>
                <div className="flex gap-1">
                  {acc.isDefault && <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium"><Star size={10} /> Default</span>}
                  <button onClick={() => openEdit(acc)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"><Edit size={15} /></button>
                  <button onClick={() => { if (confirm('Delete this account?')) deleteMutation.mutate(acc.id) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={15} /></button>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{acc.name}</h3>
              <p className="text-sm text-gray-500 mb-3">{acc.bankName}</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Account No</span><span className="font-mono font-medium text-gray-800">{acc.accountNo}</span></div>
                {acc.branch && <div className="flex justify-between"><span className="text-gray-500">Branch</span><span className="text-gray-700">{acc.branch}</span></div>}
                <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="capitalize text-gray-700">{acc.accountType.replace('_', ' ')}</span></div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">Current Balance</p>
                <p className="text-xl font-bold text-primary-600 mt-0.5">{formatCurrency(acc.balance)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }} title={editing ? 'Edit Bank Account' : 'Add Bank Account'}>
        <div className="grid grid-cols-2 gap-4">
          {[['name','Account Name *'],['bankName','Bank Name *'],['accountNo','Account Number *'],['branch','Branch']].map(([key, label]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input value={form[key]} onChange={e => f(key, e.target.value)} className="form-input" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
            <select value={form.accountType} onChange={e => f('accountType', e.target.value)} className="form-select">
              {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isDefault} onChange={e => f('isDefault', e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm font-medium text-gray-700">Set as default account</span>
            </label>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2} className="form-textarea" />
          </div>
        </div>
        <div className="flex gap-3 mt-5 pt-4 border-t">
          <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name || !form.bankName || !form.accountNo}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50">
            {saveMutation.isPending ? 'Saving…' : 'Save Account'}
          </button>
          <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
        </div>
        {saveMutation.isError && <p className="text-red-500 text-xs mt-2">{saveMutation.error?.response?.data?.message}</p>}
      </Modal>
    </div>
  )
}
