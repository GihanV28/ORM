import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { formatCurrency } from '../../lib/utils'
import PageHeader from '../../components/ui/PageHeader'
import { Upload, Download, CheckCircle, XCircle, ArrowLeft, FileText } from 'lucide-react'

const CSV_TEMPLATE = [
  'customer_name,customer_phone,alternative_phone,customer_email,shipping_address,address_line2,city,district,postal_code,payment_method,shipping_cost,discount,notes,sku_1,qty_1,price_1,sku_2,qty_2,price_2',
  'Amara Perera,0771234567,,amara@email.com,123 Galle Road,,Colombo,Colombo,00300,cod,0,0,Test order,AC001,1,1500,,,',
  'Ruwan Silva,0712345678,0711111111,,45 Kandy Road,Apt 2,Kandy,Kandy,20000,cod,300,0,,AC002,2,2500,,,',
].join('\n')

const downloadTemplate = () => {
  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'order_import_template.csv'; a.click()
  URL.revokeObjectURL(url)
}

const parseCSV = (text) => {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map((line, i) => {
    const vals = line.split(',').map(v => v.trim())
    const row = {}
    headers.forEach((h, j) => { row[h] = vals[j] || '' })
    return { ...row, _line: i + 2 }
  }).filter(r => r.customer_name && r.customer_phone)
}

const buildOrderPayload = (row) => {
  const items = []
  for (let n = 1; n <= 5; n++) {
    if (row[`sku_${n}`]) {
      items.push({ sku: row[`sku_${n}`], quantity: Number(row[`qty_${n}`]) || 1, unitPrice: Number(row[`price_${n}`]) || 0 })
    }
  }
  return {
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    alternativePhone: row.alternative_phone,
    customerEmail: row.customer_email,
    shippingAddress: row.shipping_address,
    addressLine2: row.address_line2,
    city: row.city,
    district: row.district,
    postalCode: row.postal_code,
    paymentMethod: row.payment_method || 'cod',
    shippingCost: Number(row.shipping_cost) || 0,
    discount: Number(row.discount) || 0,
    notes: row.notes,
    source: 'import',
    items,
  }
}

export default function ImportOrders() {
  const qc = useQueryClient()
  const fileRef = useRef(null)
  const [preview, setPreview] = useState([])
  const [fileName, setFileName] = useState('')
  const [results, setResults] = useState(null)
  const [importing, setImporting] = useState(false)

  const handleFile = (file) => {
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const rows = parseCSV(e.target.result)
        setPreview(rows)
        setResults(null)
      } catch {
        toast.error('Failed to parse CSV. Check the file format.')
      }
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!preview.length) return
    setImporting(true)
    let success = 0, failed = 0
    const errors = []

    for (const row of preview) {
      try {
        const payload = buildOrderPayload(row)
        if (!payload.items.length) { errors.push({ line: row._line, error: 'No items found' }); failed++; continue }
        if (!payload.city || !payload.district) { errors.push({ line: row._line, error: 'City and district required' }); failed++; continue }
        await api.post('/orders', payload)
        success++
      } catch (err) {
        failed++
        errors.push({ line: row._line, error: err?.response?.data?.message || 'Failed to create order' })
      }
    }

    setResults({ success, failed, errors })
    qc.invalidateQueries(['orders'])
    setImporting(false)
    if (success > 0) toast.success(`${success} order${success > 1 ? 's' : ''} imported successfully`)
    if (failed > 0) toast.error(`${failed} order${failed > 1 ? 's' : ''} failed to import`)
  }

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <PageHeader icon={Upload} title="Import Orders" subtitle="Bulk import orders from a CSV file"
        gradient="from-teal-600 to-cyan-700" />

      {/* Instructions */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-3">How to Import</h2>
        <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
          <li>Download the CSV template below</li>
          <li>Fill in your orders — one order per row</li>
          <li>For multiple items per order, use the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">sku_1, qty_1, price_1</code> columns (up to 5 items)</li>
          <li>Upload the file and review the preview</li>
          <li>Click Import to create all orders</li>
        </ol>
        <button onClick={downloadTemplate}
          className="mt-4 flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
          <Download size={15} /> Download CSV Template
        </button>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Upload CSV File</h2>
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
          className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-all group"
        >
          <Upload size={32} className="mx-auto text-gray-300 group-hover:text-primary-500 transition-colors mb-3" />
          <p className="font-medium text-gray-700">{fileName || 'Drop your CSV file here'}</p>
          <p className="text-sm text-gray-400 mt-1">or click to browse</p>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => handleFile(e.target.files[0])} />
        </div>
      </div>

      {/* Preview */}
      {preview.length > 0 && !results && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Preview — {preview.length} orders ready to import</h2>
              <p className="text-xs text-gray-400 mt-0.5">Review before importing</p>
            </div>
            <button onClick={handleImport} disabled={importing}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm">
              <Upload size={15} /> {importing ? `Importing… (${preview.length} orders)` : `Import ${preview.length} Orders`}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">City</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Payment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Items</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {preview.map((row, i) => {
                  const items = []
                  for (let n = 1; n <= 5; n++) { if (row[`sku_${n}`]) items.push(row[`sku_${n}`]) }
                  return (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs">{row._line}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{row.customer_name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{row.customer_phone}</td>
                      <td className="px-4 py-3 text-gray-600">{row.city}, {row.district}</td>
                      <td className="px-4 py-3 uppercase text-xs font-medium text-gray-700">{row.payment_method || 'cod'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{items.join(', ') || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Import Results</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle size={24} className="text-green-600 shrink-0" />
              <div><p className="text-2xl font-bold text-green-700">{results.success}</p><p className="text-sm text-green-600">Orders imported successfully</p></div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <XCircle size={24} className="text-red-500 shrink-0" />
              <div><p className="text-2xl font-bold text-red-600">{results.failed}</p><p className="text-sm text-red-500">Orders failed</p></div>
            </div>
          </div>
          {results.errors.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-700 mb-2 text-sm">Errors:</h3>
              <div className="space-y-1">
                {results.errors.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-red-600">
                    <XCircle size={14} className="mt-0.5 shrink-0" />
                    <span>Row {e.line}: {e.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => { setPreview([]); setResults(null); setFileName('') }} className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors">Import Another File</button>
            <Link to="/orders" className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors">View Orders</Link>
          </div>
        </div>
      )}
    </div>
  )
}
