import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { formatCurrency, formatDate } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import { FileText, Plus, Search, Trash2 } from 'lucide-react'

export default function Grn() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState([])
  const [form, setForm] = useState({ supplierId: '', purchaseOrderId: '', receivedDate: new Date().toISOString().split('T')[0], notes: '' })
  const [items, setItems] = useState([])

  const { data, isLoading } = useQuery({ queryKey: ['grn'], queryFn: () => api.get('/grn').then(r => r.data.data) })
  const { data: suppliersData } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.get('/suppliers').then(r => r.data.data) })

  const grns = data?.grns || []
  const suppliers = suppliersData?.suppliers || []

  const saveMutation = useMutation({
    mutationFn: () => api.post('/grn', { ...form, items }),
    onSuccess: () => { qc.invalidateQueries(['grn']); qc.invalidateQueries(['stock']); setShowModal(false); setItems([]); setForm({ supplierId: '', purchaseOrderId: '', receivedDate: new Date().toISOString().split('T')[0], notes: '' }) }
  })

  const searchProducts = async (q) => {
    if (!q) return setProductResults([])
    const res = await api.get('/internal/search/products', { params: { q } })
    setProductResults(res.data.data.products)
  }

  const addItem = (p) => {
    if (items.find(i => i.productId === p.id)) return
    setItems([...items, { productId: p.id, productName: p.name, sku: p.itemCode, quantity: 1, unitCost: p.costPrice || 0 }])
    setProductSearch(''); setProductResults([])
  }

  const total = items.reduce((s, i) => s + i.quantity * i.unitCost, 0)

  const columns = [
    { key: 'grnNumber', label: 'GRN #', render: r => <span className="font-mono text-xs font-semibold text-primary-700">{r.grnNumber}</span> },
    { key: 'supplier', label: 'Supplier', render: r => r.supplier?.name || '—' },
    { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
    { key: 'totalAmount', label: 'Total', render: r => formatCurrency(r.totalAmount) },
    { key: '_count', label: 'Items', render: r => `${r._count?.items || 0} items` },
    { key: 'receivedDate', label: 'Received', render: r => formatDate(r.receivedDate) },
  ]

  return (
    <div className="p-6">
      <PageHeader icon={FileText} title="Goods Received Notes" subtitle="Record stock received from suppliers"
        gradient="from-green-600 to-teal-700"
        actions={
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus size={16} /> New GRN
          </button>
        }
      />

      <DataTable columns={columns} data={grns} loading={isLoading} emptyMessage="No GRNs recorded yet." />

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Goods Received Note" size="xl">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <select value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))} className="form-select">
              <option value="">Select supplier</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Received Date</label>
            <input type="date" value={form.receivedDate} onChange={e => setForm(f => ({ ...f, receivedDate: e.target.value }))} className="form-input" />
          </div>
        </div>

        {/* Product search */}
        <div className="relative mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Add Products</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input value={productSearch} onChange={e => { setProductSearch(e.target.value); searchProducts(e.target.value) }}
              placeholder="Search products by name or SKU…" className="form-input pl-9" />
          </div>
          {productResults.length > 0 && (
            <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
              {productResults.map(p => (
                <button key={p.id} onClick={() => addItem(p)} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm flex justify-between">
                  <span className="font-medium">{p.name} <span className="text-gray-400 text-xs">{p.sku}</span></span>
                  <span className="text-primary-600 font-medium">{formatCurrency(p.costPrice || 0)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items table */}
        {items.length > 0 && (
          <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase">Qty</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Unit Cost</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                <th className="px-4 py-2.5"></th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2"><p className="font-medium">{item.productName}</p><p className="text-xs text-gray-400">{item.sku}</p></td>
                    <td className="px-4 py-2"><input type="number" min="1" value={item.quantity} onChange={e => setItems(items.map((it, i) => i === idx ? { ...it, quantity: Number(e.target.value) } : it))} className="w-16 border rounded-lg px-2 py-1 text-center text-sm mx-auto block" /></td>
                    <td className="px-4 py-2"><input type="number" value={item.unitCost} onChange={e => setItems(items.map((it, i) => i === idx ? { ...it, unitCost: Number(e.target.value) } : it))} className="w-24 border rounded-lg px-2 py-1 text-right text-sm ml-auto block" /></td>
                    <td className="px-4 py-2 text-right font-medium">{formatCurrency(item.quantity * item.unitCost)}</td>
                    <td className="px-4 py-2"><button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-gray-200 bg-gray-50"><tr>
                <td colSpan="3" className="px-4 py-2.5 text-right font-semibold text-gray-800">Total</td>
                <td className="px-4 py-2.5 text-right font-bold text-primary-700">{formatCurrency(total)}</td>
                <td></td>
              </tr></tfoot>
            </table>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="form-textarea" />
        </div>

        {saveMutation.isError && <p className="text-red-500 text-sm mb-3">{saveMutation.error?.response?.data?.message}</p>}

        <div className="flex gap-3">
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || items.length === 0}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50">
            {saveMutation.isPending ? 'Creating…' : 'Create GRN & Update Stock'}
          </button>
          <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
        </div>
      </Modal>
    </div>
  )
}
