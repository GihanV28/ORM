import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import { Plus, Search, Edit } from 'lucide-react'

const EMPTY = { name: '', contactPerson: '', phone: '', email: '', address: '', notes: '' }

export default function Suppliers() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => api.get('/suppliers', { params: { search, limit: 50 } }).then(r => r.data.data),
  })

  const suppliers = data?.suppliers || []

  const saveMutation = useMutation({
    mutationFn: (d) => editing ? api.put(`/suppliers/${editing._id}`, d) : api.post('/suppliers', d),
    onSuccess: () => { qc.invalidateQueries(['suppliers']); setShowModal(false); setEditing(null); setForm(EMPTY) }
  })

  const openEdit = (s) => { setEditing(s); setForm({ name: s.name, contactPerson: s.contactPerson || '', phone: s.phone || '', email: s.email || '', address: s.address || '', notes: s.notes || '' }); setShowModal(true) }
  const f = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const columns = [
    { key: 'name', label: 'Supplier Name', render: row => <span className="font-medium">{row.name}</span> },
    { key: 'contactPerson', label: 'Contact Person' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status', render: row => <Badge status={row.status || 'active'} /> },
    { key: 'actions', label: '', render: row => (
      <button onClick={() => openEdit(row)} className="text-blue-600 hover:text-blue-800 p-1"><Edit size={15} /></button>
    )}
  ]

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
        <button onClick={() => { setEditing(null); setForm(EMPTY); setShowModal(true) }}
          className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
          <Plus size={16} /> Add Supplier
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 max-w-sm">
          <Search size={16} className="text-gray-400" />
          <input placeholder="Search suppliers..." className="text-sm outline-none flex-1" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <DataTable columns={columns} data={suppliers} loading={isLoading} emptyMessage="No suppliers found." />

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }} title={editing ? 'Edit Supplier' : 'New Supplier'}>
        <div className="grid grid-cols-2 gap-3">
          {[['name','Supplier Name*'],['contactPerson','Contact Person'],['phone','Phone'],['email','Email'],['address','Address']].map(([key, label]) => (
            <div key={key} className={key === 'address' ? 'col-span-2' : ''}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input value={form[key]} onChange={e => f(key, e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex gap-3 mt-4 pt-4 border-t">
          <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name}
            className="flex-1 bg-blue-700 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800 disabled:opacity-50">
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
          <button onClick={() => setShowModal(false)} className="flex-1 border rounded-lg py-2 text-sm">Cancel</button>
        </div>
      </Modal>
    </div>
  )
}
