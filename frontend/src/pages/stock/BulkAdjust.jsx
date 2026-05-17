import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import PageHeader from '../../components/ui/PageHeader'
import { Warehouse, Search, Save, Plus, Minus } from 'lucide-react'

export default function BulkAdjust() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [adjustments, setAdjustments] = useState({})
  const [note, setNote] = useState('')
  const [type, setType] = useState('adjust')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)

  const { data } = useQuery({ queryKey: ['stock', search], queryFn: () => api.get('/stock', { params: { search, limit: 100 } }).then(r => r.data.data) })
  const stock = (data?.stock || []).filter(s => s.product)

  const setAdj = (productId, val) => setAdjustments(a => ({ ...a, [productId]: val }))

  const handleSave = async () => {
    const toAdjust = Object.entries(adjustments).filter(([, qty]) => qty && qty !== '0')
    if (!toAdjust.length) return alert('No adjustments entered.')
    setSaving(true)
    let success = 0
    for (const [productId, qty] of toAdjust) {
      try {
        await api.post(`/stock/${productId}/adjust`, { type, quantity: Math.abs(Number(qty)), note })
        success++
      } catch {}
    }
    setResult(`${success} of ${toAdjust.length} adjustments applied.`)
    setAdjustments({})
    qc.invalidateQueries(['stock'])
    setSaving(false)
  }

  const adjCount = Object.values(adjustments).filter(v => v && v !== '0').length

  return (
    <div className="p-6">
      <PageHeader icon={Warehouse} title="Bulk Stock Adjustment" subtitle="Adjust stock for multiple products at once"
        gradient="from-indigo-600 to-blue-700" />

      {result && (
        <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">{result}
          <button onClick={() => setResult(null)} className="ml-2 text-green-600 hover:underline text-xs">Dismiss</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search Product</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by product name or SKU…" className="form-input pl-9" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Type</label>
          <div className="flex gap-2">
            {[['adjust','Adjust'],['in','Add (In)'],['out','Remove (Out)']].map(([val, label]) => (
              <button key={val} onClick={() => setType(val)}
                className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${type === val ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 min-w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Note</label>
          <input value={note} onChange={e => setNote(e.target.value)} className="form-input" placeholder="e.g. Physical count, damaged goods…" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Products ({stock.length})</h2>
          {adjCount > 0 && (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
              <Save size={15} /> {saving ? 'Saving…' : `Apply ${adjCount} Adjustment${adjCount > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Current Stock</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Adjustment Qty</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">After Adjustment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stock.map(s => {
              const adj = Number(adjustments[s.product.id] || 0)
              const after = type === 'in' ? s.quantity + adj : type === 'out' ? s.quantity - adj : s.quantity + adj
              const hasAdj = adjustments[s.product.id] && adjustments[s.product.id] !== '0'
              return (
                <tr key={s.id} className={`hover:bg-gray-50 transition-colors ${hasAdj ? 'bg-primary-50' : ''}`}>
                  <td className="px-6 py-3">
                    <p className="font-medium text-gray-900">{s.product.name}</p>
                    <p className="text-xs text-gray-400">{s.product.itemCode}</p>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`font-bold text-lg ${s.quantity <= 0 ? 'text-red-600' : s.quantity <= (s.product.minStock || 5) ? 'text-amber-600' : 'text-gray-900'}`}>{s.quantity}</span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => setAdj(s.product.id, String(Math.max(0, adj - 1)))} className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"><Minus size={12} /></button>
                      <input type="number" value={adjustments[s.product.id] || ''} onChange={e => setAdj(s.product.id, e.target.value)}
                        className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="0" />
                      <button onClick={() => setAdj(s.product.id, String(adj + 1))} className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"><Plus size={12} /></button>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`font-bold ${hasAdj ? (after < 0 ? 'text-red-600' : 'text-primary-700') : 'text-gray-400'}`}>
                      {hasAdj ? after : '—'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
