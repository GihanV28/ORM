import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { formatDate } from '../../lib/utils'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { Plus, Edit } from 'lucide-react'

const EMPTY = { name: '', email: '', phone: '', role: '', department: '', salary: '', joinDate: '', status: 'active' }

export default function Employees() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)

  const { data: empData, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get('/hr/employees').then(r => r.data.data),
  })
  const { data: deptData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/hr/departments').then(r => r.data.data.departments),
  })

  const employees = empData?.employees || []
  const departments = deptData || []

  const saveMutation = useMutation({
    mutationFn: (d) => editing ? api.put(`/hr/employees/${editing._id}`, d) : api.post('/hr/employees', d),
    onSuccess: () => { qc.invalidateQueries(['employees']); setShowModal(false); setEditing(null); setForm(EMPTY) }
  })

  const openEdit = (e) => {
    setEditing(e)
    setForm({ name: e.name, email: e.email || '', phone: e.phone || '', role: e.role || '', department: e.department?._id || '', salary: e.salary || '', joinDate: e.joinDate ? e.joinDate.split('T')[0] : '', status: e.status })
    setShowModal(true)
  }
  const f = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const columns = [
    { key: 'name', label: 'Name', render: row => <span className="font-medium">{row.name}</span> },
    { key: 'role', label: 'Role' },
    { key: 'department', label: 'Department', render: row => row.department?.name || '—' },
    { key: 'phone', label: 'Phone' },
    { key: 'joinDate', label: 'Joined', render: row => formatDate(row.joinDate) },
    { key: 'status', label: 'Status', render: row => <Badge status={row.status} /> },
    { key: 'actions', label: '', render: row => (
      <button onClick={() => openEdit(row)} className="text-blue-600 hover:text-blue-800 p-1"><Edit size={15} /></button>
    )}
  ]

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
        <button onClick={() => { setEditing(null); setForm(EMPTY); setShowModal(true) }}
          className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
          <Plus size={16} /> Add Employee
        </button>
      </div>
      <DataTable columns={columns} data={employees} loading={isLoading} emptyMessage="No employees found." />
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }} title={editing ? 'Edit Employee' : 'New Employee'}>
        <div className="grid grid-cols-2 gap-3">
          {[['name','Name*'],['email','Email'],['phone','Phone'],['role','Role/Title']].map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input value={form[key]} onChange={e => f(key, e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
            <select value={form.department} onChange={e => f('department', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">None</option>
              {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select value={form.status} onChange={e => f('status', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Salary (LKR)</label>
            <input type="number" value={form.salary} onChange={e => f('salary', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Join Date</label>
            <input type="date" value={form.joinDate} onChange={e => f('joinDate', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex gap-3 mt-4 pt-4 border-t">
          <button onClick={() => saveMutation.mutate({ ...form, salary: Number(form.salary) || undefined })} disabled={saveMutation.isPending || !form.name}
            className="flex-1 bg-blue-700 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800 disabled:opacity-50">
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
          <button onClick={() => setShowModal(false)} className="flex-1 border rounded-lg py-2 text-sm">Cancel</button>
        </div>
      </Modal>
    </div>
  )
}
