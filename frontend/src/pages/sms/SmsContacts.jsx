import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { formatDate } from '../../lib/utils'
import PageHeader from '../../components/ui/PageHeader'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import { Users, Plus, Search, Edit, Trash2 } from 'lucide-react'

const EMPTY = { name: '', phone: '', group: '' }

export default function SmsContacts() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)

  const { data, isLoading } = useQuery({ queryKey: ['sms-contacts', search], queryFn: () => api.get('/sms/contacts', { params: { search } }).then(r => r.data.data) })
  const contacts = data?.contacts || []

  const saveMutation = useMutation({
    mutationFn: (d) => editing ? api.put(`/sms/contacts/${editing.id}`, d) : api.post('/sms/contacts', d),
    onSuccess: () => { qc.invalidateQueries(['sms-contacts']); setShowModal(false); setEditing(null); setForm(EMPTY) }
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/sms/contacts/${id}`),
    onSuccess: () => qc.invalidateQueries(['sms-contacts'])
  })

  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, phone: c.phone, group: c.group || '' }); setShowModal(true) }
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const columns = [
    { key: 'name', label: 'Name', render: r => <span className="font-medium text-gray-900">{r.name}</span> },
    { key: 'phone', label: 'Phone', render: r => <span className="font-mono text-sm">{r.phone}</span> },
    { key: 'group', label: 'Group', render: r => r.group ? <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">{r.group}</span> : '—' },
    { key: 'createdAt', label: 'Added', render: r => formatDate(r.createdAt) },
    { key: 'actions', label: '', render: r => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"><Edit size={14} /></button>
        <button onClick={() => { if (confirm('Delete contact?')) deleteMutation.mutate(r.id) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={14} /></button>
      </div>
    )}
  ]

  return (
    <div className="p-6">
      <PageHeader icon={Users} title="SMS Contacts" subtitle="Manage your SMS contact list"
        gradient="from-blue-600 to-indigo-700"
        actions={
          <button onClick={() => { setEditing(null); setForm(EMPTY); setShowModal(true) }} className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus size={16} /> Add Contact
          </button>
        }
      />

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5">
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 max-w-sm bg-gray-50">
          <Search size={15} className="text-gray-400" />
          <input placeholder="Search contacts…" value={search} onChange={e => setSearch(e.target.value)} className="text-sm outline-none flex-1 bg-transparent" />
        </div>
      </div>

      <DataTable columns={columns} data={contacts} loading={isLoading} emptyMessage="No SMS contacts yet." />

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }} title={editing ? 'Edit Contact' : 'Add Contact'} size="sm">
        <div className="space-y-3">
          {[['name','Name *'],['phone','Phone Number *'],['group','Group (optional)']].map(([key, label]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input value={form[key]} onChange={e => f(key, e.target.value)} className="form-input" placeholder={key === 'phone' ? '07XXXXXXXX' : ''} />
            </div>
          ))}
          {saveMutation.isError && <p className="text-red-500 text-sm">{saveMutation.error?.response?.data?.message}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name || !form.phone}
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50">
              {saveMutation.isPending ? 'Saving…' : 'Save Contact'}
            </button>
            <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
