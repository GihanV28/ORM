import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import Modal from '../../components/ui/Modal'
import { Plus, Edit, Users } from 'lucide-react'

export default function Departments() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/hr/departments').then(r => r.data.data.departments),
  })

  const saveMutation = useMutation({
    mutationFn: (d) => editing ? api.put(`/hr/departments/${editing._id}`, d) : api.post('/hr/departments', d),
    onSuccess: () => { qc.invalidateQueries(['departments']); setShowModal(false); setEditing(null); setForm({ name: '', description: '' }) }
  })

  const departments = data || []

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
        <button onClick={() => { setEditing(null); setForm({ name: '', description: '' }); setShowModal(true) }}
          className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800">
          <Plus size={16} /> Add Department
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {isLoading ? <div className="p-8 text-center text-gray-400">Loading...</div> :
          departments.length === 0 ? <div className="p-8 text-center text-gray-400">No departments</div> :
          departments.map(dept => (
            <div key={dept._id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <Users size={16} className="text-blue-500" />
                <div>
                  <p className="font-medium text-gray-800">{dept.name}</p>
                  {dept.description && <p className="text-xs text-gray-400">{dept.description}</p>}
                </div>
              </div>
              <button onClick={() => { setEditing(dept); setForm({ name: dept.name, description: dept.description || '' }); setShowModal(true) }}
                className="text-blue-600 hover:text-blue-800 p-1"><Edit size={15} /></button>
            </div>
          ))
        }
      </div>
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }} title={editing ? 'Edit Department' : 'New Department'} size="sm">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name*</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name}
              className="flex-1 bg-blue-700 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-800 disabled:opacity-50">
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setShowModal(false)} className="flex-1 border rounded-lg py-2 text-sm">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
