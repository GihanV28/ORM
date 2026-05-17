import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { formatCurrency, formatDate, DISTRICTS } from '../lib/utils'
import Badge from '../components/ui/Badge'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import { Search, Plus, Edit, Eye } from 'lucide-react'

const EMPTY = { name: '', phone: '', email: '', address: '', city: '', district: '', postalCode: '', notes: '' }

export default function Customers() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [viewCustomer, setViewCustomer] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: () => api.get('/customers', { params: { search, page, limit: 25 } }).then(r => r.data.data),
  })

  const customers = data?.customers || []
  const pagination = data?.pagination || {}

  const saveMutation = useMutation({
    mutationFn: (d) => editing ? api.put(`/customers/${editing._id}`, d) : api.post('/customers', d),
    onSuccess: () => { qc.invalidateQueries(['customers']); setShowModal(false); setEditing(null); setForm(EMPTY) }
  })

  const openEdit = (c) => {
    setEditing(c)
    setForm({ name: c.name, phone: c.phone, email: c.email || '', address: c.address || '', city: c.city || '', district: c.district || '', postalCode: c.postalCode || '', notes: c.notes || '' })
    setShowModal(true)
  }
  const f = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const columns = [
    { key: 'name', label: 'Name', render: row => (
      <button onClick={() => setViewCustomer(row)} className="font-medium text-blue-700 hover:underline text-left">{row.name}</button>
    )},
    { key: 'phone', label: 'Phone' },
    { key: 'city', label: 'City' },
    { key: 'district', label: 'District' },
    { key: 'totalOrders', label: 'Orders' },
    { key: 'totalSpent', label: 'Total Spent', render: row => formatCurrency(row.totalSpent) },
    { key: 'status', label: 'Status', render: row => <Badge status={row.status} /> },
    { key: 'actions', label: '', render: row => (
      <button onClick={() => openEdit(row)} className="text-blue-600 hover:text-blue-800 p-1"><Edit size={15} /></button>
    )}
  ]

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <button onClick={() => { setEditing(null); setForm(EMPTY); setShowModal(true) }}
          className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
          <Plus size={16} /> Add Customer
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 max-w-sm">
          <Search size={16} className="text-gray-400" />
          <input placeholder="Search by name, phone, email..." className="text-sm outline-none flex-1"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
      </div>

      <DataTable columns={columns} data={customers} loading={isLoading} emptyMessage="No customers found." />

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Page {pagination.page} of {pagination.pages} ({pagination.total} customers)</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
            <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {/* Customer Form Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }} title={editing ? 'Edit Customer' : 'New Customer'}>
        <div className="grid grid-cols-2 gap-3">
          {[['name','Name*'],['phone','Phone*'],['email','Email'],['city','City'],['postalCode','Postal Code']].map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input value={form[key]} onChange={e => f(key, e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">District</label>
            <select value={form.district} onChange={e => f('district', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Select district</option>
              {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
            <input value={form.address} onChange={e => f('address', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex gap-3 mt-4 pt-4 border-t">
          <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name || !form.phone}
            className="flex-1 bg-blue-700 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800 disabled:opacity-50">
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
          <button onClick={() => setShowModal(false)} className="flex-1 border rounded-lg py-2 text-sm">Cancel</button>
        </div>
      </Modal>

      {/* Customer View Modal */}
      <Modal open={!!viewCustomer} onClose={() => setViewCustomer(null)} title="Customer Details">
        {viewCustomer && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-gray-500">Name</p><p className="font-medium">{viewCustomer.name}</p></div>
              <div><p className="text-gray-500">Phone</p><p className="font-medium">{viewCustomer.phone}</p></div>
              {viewCustomer.email && <div><p className="text-gray-500">Email</p><p>{viewCustomer.email}</p></div>}
              <div><p className="text-gray-500">Total Orders</p><p className="font-bold text-blue-700">{viewCustomer.totalOrders}</p></div>
              <div><p className="text-gray-500">Total Spent</p><p className="font-bold text-green-700">{formatCurrency(viewCustomer.totalSpent)}</p></div>
              <div><p className="text-gray-500">Status</p><Badge status={viewCustomer.status} /></div>
            </div>
            {viewCustomer.address && <div><p className="text-gray-500">Address</p><p>{viewCustomer.address}, {viewCustomer.city}, {viewCustomer.district}</p></div>}
            {viewCustomer.notes && <div><p className="text-gray-500">Notes</p><p>{viewCustomer.notes}</p></div>}
            <p className="text-gray-400 text-xs">Customer since {formatDate(viewCustomer.createdAt)}</p>
          </div>
        )}
      </Modal>
    </div>
  )
}
