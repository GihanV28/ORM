import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import PageHeader from '../../components/ui/PageHeader'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import { ShieldCheck, Edit, Save } from 'lucide-react'

const ALL_PERMISSIONS = [
  { key: 'orders', label: 'Orders' },
  { key: 'products', label: 'Products' },
  { key: 'stock', label: 'Stock' },
  { key: 'customers', label: 'Customers' },
  { key: 'pos', label: 'POS' },
  { key: 'reports', label: 'Reports' },
  { key: 'grn', label: 'GRN' },
  { key: 'po', label: 'Purchase Orders' },
  { key: 'hr', label: 'HR' },
  { key: 'cash_management', label: 'Cash & Bank' },
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'returns', label: 'Returns' },
  { key: 'settings', label: 'Settings' },
]

export default function Roles() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ employeeId: '', roleName: '', permissions: [] })

  const { data: empData } = useQuery({ queryKey: ['employees'], queryFn: () => api.get('/hr/employees').then(r => r.data.data) })
  const employees = empData?.employees || []

  const saveMutation = useMutation({
    mutationFn: (d) => api.put(`/hr/employees/${d.employeeId}`, { role: d.roleName, permissions: d.permissions }),
    onSuccess: () => { qc.invalidateQueries(['employees']); setShowModal(false); setEditing(null) }
  })

  const openEdit = (emp) => {
    setEditing(emp)
    setForm({ employeeId: emp.id, roleName: emp.role || '', permissions: emp.permissions || [] })
    setShowModal(true)
  }

  const togglePermission = (key) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(key) ? f.permissions.filter(p => p !== key) : [...f.permissions, key]
    }))
  }

  return (
    <div className="p-6">
      <PageHeader icon={ShieldCheck} title="Roles & Permissions" subtitle="Assign roles and control access for employees"
        gradient="from-slate-600 via-slate-700 to-gray-800" />

      {employees.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200">
          <EmptyState icon={ShieldCheck} title="No Employees Found" description="Add employees first before assigning roles and permissions." />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Employee Roles & Permissions</h2>
            <p className="text-sm text-gray-500 mt-0.5">Click Edit to manage an employee's access level</p>
          </div>
          <div className="divide-y divide-gray-100">
            {employees.map(emp => (
              <div key={emp.id} className="px-6 py-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-primary-700 font-bold text-sm">
                    {emp.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{emp.name}</p>
                    <p className="text-xs text-gray-500">{emp.email}</p>
                    <p className="text-xs text-primary-600 font-medium mt-0.5">{emp.role || 'No role assigned'}</p>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap gap-1.5">
                    {(emp.permissions || []).map(p => {
                      const perm = ALL_PERMISSIONS.find(ap => ap.key === p)
                      return (
                        <span key={p} className="inline-flex items-center px-2 py-0.5 rounded-lg bg-primary-100 text-primary-700 text-xs font-medium">
                          {perm?.label || p}
                        </span>
                      )
                    })}
                    {(!emp.permissions || emp.permissions.length === 0) && <span className="text-xs text-gray-400 italic">No permissions</span>}
                  </div>
                </div>
                <button onClick={() => openEdit(emp)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 border border-primary-200 rounded-lg transition-colors shrink-0">
                  <Edit size={13} /> Edit
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={`Edit Role — ${editing?.name}`} size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role / Title</label>
            <input value={form.roleName} onChange={e => setForm(f => ({ ...f, roleName: e.target.value }))} className="form-input" placeholder="e.g. Sales Manager, Warehouse Staff" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Module Access Permissions</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {ALL_PERMISSIONS.map(p => (
                <label key={p.key} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${form.permissions.includes(p.key) ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="checkbox" checked={form.permissions.includes(p.key)} onChange={() => togglePermission(p.key)} className="w-4 h-4 rounded text-primary-600" />
                  <span className="text-xs font-medium text-gray-700">{p.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button onClick={() => setForm(f => ({ ...f, permissions: ALL_PERMISSIONS.map(p => p.key) }))} className="text-xs text-primary-600 hover:underline">Select all</button>
            <span className="text-gray-300">·</span>
            <button onClick={() => setForm(f => ({ ...f, permissions: [] }))} className="text-xs text-gray-500 hover:underline">Clear all</button>
          </div>
          {saveMutation.isError && <p className="text-red-500 text-sm">{saveMutation.error?.response?.data?.message}</p>}
          <div className="flex gap-3 pt-2 border-t">
            <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50">
              <Save size={15} /> {saveMutation.isPending ? 'Saving…' : 'Save Role & Permissions'}
            </button>
            <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
