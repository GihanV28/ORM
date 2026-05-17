import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import PageHeader from '../../components/ui/PageHeader'
import Modal from '../../components/ui/Modal'
import { Tag, Plus, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

export default function VariationAttributes() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [expanded, setExpanded] = useState({})
  const [newAttr, setNewAttr] = useState({ name: '', values: '' })
  const [editAttr, setEditAttr] = useState(null)
  const [newValue, setNewValue] = useState({})

  const { data, isLoading } = useQuery({ queryKey: ['attributes'], queryFn: () => api.get('/attributes').then(r => r.data.data.attributes) })
  const attributes = data || []

  const createMutation = useMutation({
    mutationFn: (d) => api.post('/attributes', d),
    onSuccess: () => { qc.invalidateQueries(['attributes']); setShowCreate(false); setNewAttr({ name: '', values: '' }); toast.success('Attribute created') }
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, name }) => api.put(`/attributes/${id}`, { name }),
    onSuccess: () => { qc.invalidateQueries(['attributes']); setEditAttr(null); toast.success('Attribute updated') }
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/attributes/${id}`),
    onSuccess: () => { qc.invalidateQueries(['attributes']); toast.success('Attribute deleted') }
  })
  const addValueMutation = useMutation({
    mutationFn: ({ id, value }) => api.post(`/attributes/${id}/values`, { value }),
    onSuccess: () => { qc.invalidateQueries(['attributes']); toast.success('Value added') }
  })
  const deleteValueMutation = useMutation({
    mutationFn: ({ attrId, valueId }) => api.delete(`/attributes/${attrId}/values/${valueId}`),
    onSuccess: () => { qc.invalidateQueries(['attributes']); toast.success('Value deleted') }
  })

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }))

  const handleCreate = () => {
    if (!newAttr.name) return toast.error('Name required')
    const values = newAttr.values.split(',').map(v => v.trim()).filter(Boolean).map(v => ({ value: v }))
    createMutation.mutate({ name: newAttr.name, values })
  }

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <PageHeader icon={Tag} title="Variation Attributes" subtitle="Define attributes like Size, Color, Material for product variants"
        gradient="from-violet-600 to-purple-700"
        actions={
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-semibold transition-colors">
            <Plus size={16} /> New Attribute
          </button>
        }
      />

      {isLoading ? <div className="text-center py-10 text-gray-400">Loading…</div>
        : attributes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
            <Tag size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="font-semibold text-gray-700">No attributes yet</p>
            <p className="text-sm text-gray-400 mt-1">Create attributes like "Size", "Color" to define variants</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attributes.map(attr => (
              <div key={attr.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4">
                  {editAttr?.id === attr.id ? (
                    <input value={editAttr.name} onChange={e => setEditAttr(a => ({ ...a, name: e.target.value }))}
                      className="form-input flex-1 mr-3" autoFocus />
                  ) : (
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center"><Tag size={16} className="text-violet-600" /></div>
                      <div>
                        <p className="font-semibold text-gray-900">{attr.name}</p>
                        <p className="text-xs text-gray-400">{attr.values.length} value{attr.values.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    {editAttr?.id === attr.id ? (
                      <>
                        <button onClick={() => updateMutation.mutate({ id: attr.id, name: editAttr.name })} className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700 transition-colors">Save</button>
                        <button onClick={() => setEditAttr(null)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50 transition-colors">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEditAttr({ id: attr.id, name: attr.name })} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"><Edit size={14} /></button>
                        <button onClick={() => { if (confirm(`Delete "${attr.name}"?`)) deleteMutation.mutate(attr.id) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={14} /></button>
                        <button onClick={() => toggle(attr.id)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition">
                          {expanded[attr.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {expanded[attr.id] && (
                  <div className="px-5 pb-4 border-t border-gray-100">
                    <div className="flex flex-wrap gap-2 mt-3 mb-3">
                      {attr.values.map(v => (
                        <div key={v.id} className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1">
                          <span className="text-sm text-gray-700">{v.value}</span>
                          <button onClick={() => deleteValueMutation.mutate({ attrId: attr.id, valueId: v.id })} className="text-gray-400 hover:text-red-500 transition"><Trash2 size={11} /></button>
                        </div>
                      ))}
                      {attr.values.length === 0 && <p className="text-xs text-gray-400 italic">No values yet</p>}
                    </div>
                    <div className="flex gap-2">
                      <input placeholder="Add value (e.g. Red, XL)…" value={newValue[attr.id] || ''}
                        onChange={e => setNewValue(v => ({ ...v, [attr.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter' && newValue[attr.id]) { addValueMutation.mutate({ id: attr.id, value: newValue[attr.id] }); setNewValue(v => ({ ...v, [attr.id]: '' })) }}}
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
                      <button onClick={() => { if (newValue[attr.id]) { addValueMutation.mutate({ id: attr.id, value: newValue[attr.id] }); setNewValue(v => ({ ...v, [attr.id]: '' })) }}}
                        className="px-3 py-2 bg-primary-600 text-white rounded-xl text-sm hover:bg-primary-700 transition-colors">
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Variation Attribute" size="sm">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Attribute Name *</label>
            <input value={newAttr.name} onChange={e => setNewAttr(a => ({ ...a, name: e.target.value }))} className="form-input" placeholder="e.g. Size, Color, Material" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Initial Values (comma-separated)</label>
            <input value={newAttr.values} onChange={e => setNewAttr(a => ({ ...a, values: e.target.value }))} className="form-input" placeholder="e.g. S, M, L, XL" />
            <p className="text-xs text-gray-400 mt-1">You can add more values later</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleCreate} disabled={createMutation.isPending || !newAttr.name}
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50">
              {createMutation.isPending ? 'Creating…' : 'Create Attribute'}
            </button>
            <button onClick={() => setShowCreate(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
