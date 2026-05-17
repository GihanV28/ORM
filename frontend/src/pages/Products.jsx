import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { formatCurrency } from '../lib/utils'
import Badge from '../components/ui/Badge'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import PageHeader from '../components/ui/PageHeader'
import { Plus, Search, Edit, Trash2, Package, Layers } from 'lucide-react'

const EMPTY = { name: '', sku: '', barcode: '', category: '', sellingPrice: '', costPrice: '', comparePrice: '', description: '', unit: '', minStock: 5, status: 'active', notes: '', hasVariants: false }

export default function Products() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', search, statusFilter, categoryFilter],
    queryFn: () => api.get('/products', { params: { search, status: statusFilter || undefined, categoryId: categoryFilter || undefined, limit: 100 } }).then(r => r.data.data),
  })
  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data.data.categories),
  })

  const products = productsData?.products || []
  const categories = catData || []

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? api.put(`/products/${editing._id || editing.id}`, data)
      : api.post('/products', data),
    onSuccess: () => {
      qc.invalidateQueries(['products'])
      setShowModal(false); setEditing(null); setForm(EMPTY)
      toast.success(editing ? 'Product updated' : 'Product created')
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to save product')
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => { qc.invalidateQueries(['products']); toast.success('Product deleted') }
  })

  const openEdit = (p) => {
    setEditing(p)
    setForm({
      name: p.name, sku: p.sku || p.itemCode || '', barcode: p.barcode || '', category: p.category?._id || p.category?.id || p.categoryId || '',
      sellingPrice: p.sellingPrice || p.price, costPrice: p.costPrice || '', comparePrice: p.comparePrice || '',
      description: p.description || '', unit: p.unit || '', minStock: p.minStock || 5,
      status: p.status, notes: p.productNotes || p.notes || '', hasVariants: p.hasVariants || false,
    })
    setShowModal(true)
  }
  const f = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const columns = [
    { key: 'name', label: 'Product', render: row => (
      <div>
        <p className="font-semibold text-gray-900">{row.name}</p>
        <p className="text-xs text-gray-400">{row.sku || row.itemCode}{row.barcode ? ` · ${row.barcode}` : ''}</p>
        {row.hasVariants && <span className="text-xs bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 font-medium">Variable</span>}
      </div>
    )},
    { key: 'category', label: 'Category', render: row => row.category?.name || '—' },
    { key: 'costPrice', label: 'Cost', render: row => row.costPrice > 0 ? formatCurrency(row.costPrice) : '—' },
    { key: 'price', label: 'Price', render: row => <span className="font-semibold text-primary-700">{formatCurrency(row.sellingPrice || row.price)}</span> },
    { key: 'stock', label: 'Stock', render: row => {
      const qty = row.stockRecord ? row.stockRecord.quantity : (row.stock || 0)
      const isLow = qty <= (row.minStock || 5) && qty > 0
      const isOut = qty <= 0
      return <span className={`font-bold ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-gray-900'}`}>{qty}</span>
    }},
    { key: 'status', label: 'Status', render: row => <Badge status={row.status} /> },
    { key: 'actions', label: '', render: row => (
      <div className="flex items-center gap-1.5">
        {row.hasVariants && (
          <Link to={`/products/${row._id || row.id}/variants`}
            className="text-xs text-purple-600 hover:text-purple-800 border border-purple-200 px-2 py-1 rounded-lg hover:bg-purple-50 transition-colors font-medium">
            Variants
          </Link>
        )}
        <button onClick={() => openEdit(row)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><Edit size={14} /></button>
        <button onClick={() => { if (confirm('Delete product?')) deleteMutation.mutate(row._id || row.id) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
      </div>
    )}
  ]

  const STATUS_OPTIONS = ['active','inactive','published','draft','out_of_stock']

  return (
    <div className="p-6 space-y-5">
      <PageHeader icon={Package} title="Products" subtitle="Manage your product catalog and inventory"
        gradient="from-primary-600 to-indigo-700"
        actions={
          <button onClick={() => { setEditing(null); setForm(EMPTY); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-semibold transition-colors">
            <Plus size={16} /> Add Product
          </button>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 flex-1 min-w-52">
          <Search size={15} className="text-gray-400" />
          <input placeholder="Search by name or SKU…" className="text-sm outline-none bg-transparent flex-1"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="form-select text-sm">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-select text-sm">
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        {(search || statusFilter || categoryFilter) && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); setCategoryFilter('') }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Clear filters
          </button>
        )}
      </div>

      <DataTable columns={columns} data={products} loading={isLoading} emptyMessage="No products found." />

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }} title={editing ? 'Edit Product' : 'New Product'} size="lg">
        <div className="grid grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-1">
          {[['name','Product Name *'],['sku','SKU *'],['barcode','Barcode'],['unit','Unit (piece / kg / set)']].map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input value={form[key]} onChange={e => f(key, e.target.value)} className="form-input" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select value={form.category} onChange={e => f('category', e.target.value)} className="form-select">
              <option value="">No category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select value={form.status} onChange={e => f('status', e.target.value)} className="form-select">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
          {[['sellingPrice','Selling Price (LKR) *','number'],['costPrice','Cost Price (LKR)','number'],['comparePrice','Compare/Original Price','number'],['minStock','Min Stock Alert','number']].map(([key, label, type]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input type={type} value={form[key]} onChange={e => f(key, e.target.value)} className="form-input" />
            </div>
          ))}
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id="hasVariants" checked={form.hasVariants} onChange={e => f('hasVariants', e.target.checked)} className="w-4 h-4 rounded" />
            <label htmlFor="hasVariants" className="text-sm font-medium text-gray-700">Variable product (has size/colour variants)</label>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea value={form.description} onChange={e => f('description', e.target.value)} rows={2} className="form-textarea" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Internal Notes</label>
            <textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2} className="form-textarea" placeholder="Batch number, supplier notes…" />
          </div>
        </div>
        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
          <button onClick={() => saveMutation.mutate({
            ...form,
            sellingPrice: Number(form.sellingPrice),
            costPrice: Number(form.costPrice) || 0,
            comparePrice: Number(form.comparePrice) || undefined,
            minStock: Number(form.minStock) || 5,
          })} disabled={saveMutation.isPending || !form.name || !form.sku || !form.sellingPrice}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm shadow-primary-500/25">
            {saveMutation.isPending ? 'Saving…' : 'Save Product'}
          </button>
          <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition-colors">Cancel</button>
        </div>
        {saveMutation.isError && <p className="text-red-500 text-xs mt-2">{saveMutation.error?.response?.data?.message}</p>}
      </Modal>
    </div>
  )
}
