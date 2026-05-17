import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { formatCurrency } from '../../lib/utils'
import PageHeader from '../../components/ui/PageHeader'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import { ArrowLeft, Plus, Edit, Trash2, Layers } from 'lucide-react'

const EMPTY_VARIANT = { sku: '', price: '', cost: '', stock: '', attributes: {}, status: 'active' }

export default function ProductVariants() {
  const { id } = useParams()
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_VARIANT)
  const [attrInputs, setAttrInputs] = useState({})

  const { data: productData } = useQuery({ queryKey: ['product', id], queryFn: () => api.get(`/products/${id}`).then(r => r.data.data.product) })
  const { data: variantsData, isLoading } = useQuery({ queryKey: ['variants', id], queryFn: () => api.get(`/products/${id}/variants`).then(r => r.data.data.variants) })
  const { data: attrsData } = useQuery({ queryKey: ['attributes'], queryFn: () => api.get('/attributes').then(r => r.data.data.attributes) })

  const product = productData
  const variants = variantsData || []
  const attributes = attrsData || []

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? api.put(`/products/${id}/variants/${editing.id}`, data)
      : api.post(`/products/${id}/variants`, data),
    onSuccess: () => { qc.invalidateQueries(['variants', id]); setShowModal(false); setEditing(null); setForm(EMPTY_VARIANT); setAttrInputs({}); toast.success('Variant saved') }
  })

  const deleteMutation = useMutation({
    mutationFn: (variantId) => api.delete(`/products/${id}/variants/${variantId}`),
    onSuccess: () => { qc.invalidateQueries(['variants', id]); toast.success('Variant deleted') }
  })

  const openNew = () => { setEditing(null); setForm(EMPTY_VARIANT); setAttrInputs({}); setShowModal(true) }
  const openEdit = (v) => {
    setEditing(v)
    setForm({ sku: v.sku, price: v.price, cost: v.cost || '', stock: v.stock, status: v.status })
    setAttrInputs(v.attributes || {})
    setShowModal(true)
  }

  const buildAttributesObj = () => {
    const attrs = {}
    for (const [key, val] of Object.entries(attrInputs)) { if (val) attrs[key] = val }
    return attrs
  }

  const totalVariantStock = variants.reduce((s, v) => s + v.stock, 0)

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/products" className="text-gray-400 hover:text-gray-700"><ArrowLeft size={20} /></Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{product?.name || 'Product'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{product?.itemCode} · Variant Management</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
          <Plus size={16} /> Add Variant
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <p className="text-sm text-gray-500">Total Variants</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{variants.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <p className="text-sm text-gray-500">Total Stock</p>
          <p className="text-2xl font-bold text-primary-700 mt-1">{totalVariantStock}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <p className="text-sm text-gray-500">Price Range</p>
          <p className="text-base font-bold text-gray-900 mt-1">
            {variants.length > 0
              ? `${formatCurrency(Math.min(...variants.map(v => v.price)))} – ${formatCurrency(Math.max(...variants.map(v => v.price)))}`
              : '—'}
          </p>
        </div>
      </div>

      {/* Variants table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Variants</h2>
        </div>
        {isLoading ? <div className="py-10 text-center text-gray-400">Loading…</div>
          : variants.length === 0 ? (
            <EmptyState icon={Layers} title="No variants yet" description="Add size, colour or other attribute combinations."
              action={<button onClick={openNew} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"><Plus size={15} /> Add First Variant</button>} />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Attributes</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Cost</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {variants.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs font-semibold text-gray-700">{v.sku}</td>
                    <td className="px-6 py-3">
                      <div className="flex flex-wrap gap-1">
                        {v.attributes && Object.entries(v.attributes).map(([k, val]) => (
                          <span key={k} className="inline-flex items-center px-2 py-0.5 rounded-lg bg-primary-100 text-primary-700 text-xs font-medium">
                            {k}: {val}
                          </span>
                        ))}
                        {(!v.attributes || Object.keys(v.attributes).length === 0) && <span className="text-gray-300 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right font-semibold">{formatCurrency(v.price)}</td>
                    <td className="px-6 py-3 text-right text-gray-500">{v.cost ? formatCurrency(v.cost) : '—'}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`font-bold ${v.stock <= 0 ? 'text-red-600' : v.stock <= 5 ? 'text-amber-600' : 'text-gray-900'}`}>{v.stock}</span>
                    </td>
                    <td className="px-6 py-3"><Badge status={v.status} /></td>
                    <td className="px-6 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => openEdit(v)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"><Edit size={14} /></button>
                        <button onClick={() => { if (confirm('Delete this variant?')) deleteMutation.mutate(v.id) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {/* Add/Edit Variant Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }} title={editing ? 'Edit Variant' : 'Add Variant'}>
        <div className="space-y-4">
          {/* Attributes */}
          {attributes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Attributes</label>
              <div className="grid grid-cols-2 gap-3">
                {attributes.map(attr => (
                  <div key={attr.id}>
                    <label className="block text-xs text-gray-500 mb-1">{attr.name}</label>
                    <select value={attrInputs[attr.name] || ''} onChange={e => setAttrInputs(a => ({ ...a, [attr.name]: e.target.value }))} className="form-select text-sm">
                      <option value="">Select {attr.name}</option>
                      {attr.values.map(v => <option key={v.id} value={v.value}>{v.value}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
            <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} className="form-input" placeholder="e.g. AC001-RED-M" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (LKR) *</label>
              <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="form-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost (LKR)</label>
              <input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} className="form-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
              <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} className="form-input" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="form-select">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => saveMutation.mutate({ ...form, price: Number(form.price), cost: Number(form.cost) || 0, stock: Number(form.stock) || 0, attributes: buildAttributesObj() })}
              disabled={saveMutation.isPending || !form.sku || !form.price}
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50">
              {saveMutation.isPending ? 'Saving…' : 'Save Variant'}
            </button>
            <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
