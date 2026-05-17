import Spinner from './Spinner'
import EmptyState from './EmptyState'
import { Inbox } from 'lucide-react'

export default function DataTable({ columns, data, loading, emptyMessage = 'No records found.', emptyIcon }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map(col => (
                <th key={col.key} className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={columns.length} className="py-12 text-center"><Spinner className="mx-auto" /></td></tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState icon={emptyIcon || Inbox} title="No records found" description={emptyMessage} />
                </td>
              </tr>
            ) : data.map((row, i) => (
              <tr key={row._id || row.id || i} className="hover:bg-gray-50 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className="px-6 py-4 text-gray-700 whitespace-nowrap">
                    {col.render ? col.render(row) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
