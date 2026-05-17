import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import { BarChart2, MessageSquare, Users, CheckCircle, XCircle } from 'lucide-react'

export default function SmsUsage() {
  const { data: campaignData } = useQuery({
    queryKey: ['sms-campaigns'],
    queryFn: () => api.get('/sms/campaigns').then(r => r.data.data),
  })
  const { data: contactData } = useQuery({
    queryKey: ['sms-contacts'],
    queryFn: () => api.get('/sms/contacts').then(r => r.data.data),
  })

  const campaigns = campaignData?.campaigns || []
  const stats = campaignData?.stats || {}
  const totalContacts = contactData?.pagination?.total || 0

  const totalSent = campaigns.reduce((s, c) => s + c.sent, 0)
  const totalFailed = campaigns.reduce((s, c) => s + c.failed, 0)
  const totalRecipients = campaigns.reduce((s, c) => s + c.recipients, 0)
  const successRate = totalRecipients > 0 ? ((totalSent / totalRecipients) * 100).toFixed(1) : '0'

  const byStatus = campaigns.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1; return acc
  }, {})

  return (
    <div className="p-6 space-y-5">
      <PageHeader icon={BarChart2} title="SMS Usage" subtitle="Campaign statistics and delivery rates"
        gradient="from-teal-500 to-emerald-600" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={MessageSquare} label="Total Campaigns" value={campaigns.length} color="primary" />
        <StatCard icon={CheckCircle} label="SMS Delivered" value={totalSent} color="green" />
        <StatCard icon={XCircle} label="SMS Failed" value={totalFailed} color="red" />
        <StatCard icon={Users} label="Total Contacts" value={totalContacts} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Campaign summary */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Campaign Performance</h2>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">Total Recipients</span>
              <span className="font-semibold text-gray-900">{totalRecipients}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">Messages Sent</span>
              <span className="font-semibold text-green-700">{totalSent}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">Messages Failed</span>
              <span className="font-semibold text-red-600">{totalFailed}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-gray-500">Delivery Rate</span>
              <span className={`font-bold text-lg ${Number(successRate) >= 90 ? 'text-green-600' : Number(successRate) >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                {successRate}%
              </span>
            </div>
          </div>

          {/* Delivery rate bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className="bg-green-500 h-2.5 rounded-full transition-all" style={{ width: `${successRate}%` }} />
            </div>
          </div>
        </div>

        {/* Campaign status breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">By Status</h2>
          {Object.keys(byStatus).length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No campaigns yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(byStatus).map(([status, count]) => {
                const colors = {
                  draft: 'bg-gray-100 text-gray-600',
                  sending: 'bg-blue-100 text-blue-700',
                  completed: 'bg-green-100 text-green-700',
                  failed: 'bg-red-100 text-red-700',
                  cancelled: 'bg-amber-100 text-amber-700',
                }
                return (
                  <div key={status} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
                    <span className="font-bold text-gray-900">{count} campaign{count !== 1 ? 's' : ''}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent campaigns */}
      {campaigns.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Campaigns</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Campaign</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Recipients</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Sent</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Failed</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {campaigns.slice(0, 10).map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-6 py-3 text-center">{c.recipients}</td>
                  <td className="px-6 py-3 text-center text-green-700 font-medium">{c.sent}</td>
                  <td className="px-6 py-3 text-center text-red-500">{c.failed}</td>
                  <td className="px-6 py-3 text-center font-semibold">
                    {c.recipients > 0 ? `${((c.sent / c.recipients) * 100).toFixed(0)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
