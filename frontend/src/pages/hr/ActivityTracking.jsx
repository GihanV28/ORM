import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { formatDateTime } from '../../lib/utils'
import PageHeader from '../../components/ui/PageHeader'
import DataTable from '../../components/ui/DataTable'
import { Activity } from 'lucide-react'

export default function ActivityTracking() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['activity', page],
    queryFn: () => api.get('/activity', { params: { page, limit: 50 } }).then(r => r.data.data),
  })

  const logs = data?.logs || []
  const pagination = data?.pagination || {}

  const columns = [
    { key: 'createdAt', label: 'Time', render: r => <span className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(r.createdAt)}</span> },
    { key: 'actor', label: 'Actor', render: r => (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-primary-100 rounded-lg flex items-center justify-center text-primary-700 text-xs font-bold">
          {(r.actorName || 'S').charAt(0)}
        </div>
        <div>
          <p className="font-medium text-sm text-gray-900">{r.actorName || 'System'}</p>
          <p className="text-xs text-gray-400 capitalize">{r.actorType || 'system'}</p>
        </div>
      </div>
    )},
    { key: 'action', label: 'Action', render: r => <span className="font-medium text-gray-800">{r.action}</span> },
    { key: 'model', label: 'Module', render: r => r.model ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium capitalize">{r.model}</span>
    ) : '—' },
    { key: 'recordId', label: 'Record', render: r => r.recordId ? <span className="font-mono text-xs text-gray-400">{r.recordId.slice(-8)}</span> : '—' },
    { key: 'ip', label: 'IP', render: r => <span className="font-mono text-xs text-gray-400">{r.ip || '—'}</span> },
  ]

  return (
    <div className="p-6">
      <PageHeader icon={Activity} title="Activity Tracking" subtitle="Monitor all actions performed in the system"
        gradient="from-slate-600 via-slate-700 to-gray-800" />

      <DataTable columns={columns} data={logs} loading={isLoading} emptyMessage="No activity logs yet." />

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>Page {pagination.page} of {pagination.pages} ({pagination.total} logs)</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">Prev</button>
            <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
