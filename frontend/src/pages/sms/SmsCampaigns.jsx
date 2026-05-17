import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../lib/api'
import { formatDate } from '../../lib/utils'
import PageHeader from '../../components/ui/PageHeader'
import DataTable from '../../components/ui/DataTable'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/ui/StatCard'
import EmptyState from '../../components/ui/EmptyState'
import { MessageSquare, Plus, Trash2, Send, Users, CheckCircle, BarChart2 } from 'lucide-react'

export default function SmsCampaigns() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', message: '' })
  const charCount = form.message.length
  const smsCount = Math.ceil(charCount / 160) || 1

  const { data, isLoading } = useQuery({ queryKey: ['sms-campaigns'], queryFn: () => api.get('/sms/campaigns').then(r => r.data.data) })
  const campaigns = data?.campaigns || []
  const stats = data?.stats || {}

  const saveMutation = useMutation({
    mutationFn: (d) => api.post('/sms/campaigns', d),
    onSuccess: () => { qc.invalidateQueries(['sms-campaigns']); setShowModal(false); setForm({ name: '', message: '' }) }
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/sms/campaigns/${id}`),
    onSuccess: () => qc.invalidateQueries(['sms-campaigns'])
  })

  const columns = [
    { key: 'name', label: 'Campaign', render: r => <span className="font-semibold text-gray-900">{r.name}</span> },
    { key: 'recipients', label: 'Recipients', render: r => <span className="font-medium">{r.recipients}</span> },
    { key: 'sent', label: 'Sent', render: r => <span className="text-green-600 font-medium">{r.sent}</span> },
    { key: 'failed', label: 'Failed', render: r => <span className="text-red-500 font-medium">{r.failed}</span> },
    { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
    { key: 'createdAt', label: 'Created', render: r => formatDate(r.createdAt) },
    { key: 'actions', label: '', render: r => (
      <button onClick={() => { if (confirm('Delete campaign?')) deleteMutation.mutate(r.id) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={14} /></button>
    )}
  ]

  return (
    <div className="p-6">
      <PageHeader icon={MessageSquare} title="SMS Campaigns" subtitle="Send bulk SMS messages to your customers"
        gradient="from-emerald-500 to-teal-600"
        actions={
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium transition-colors">
            <Plus size={16} /> New Campaign
          </button>
        }
      />

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6 flex items-start gap-3">
        <div className="w-5 h-5 text-amber-500 mt-0.5 shrink-0">⚠️</div>
        <div>
          <p className="text-sm font-medium text-amber-800">SMS API Setup Required</p>
          <p className="text-xs text-amber-700 mt-0.5">Configure your SMS API credentials in Settings → SMS Settings to enable sending campaigns.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={MessageSquare} label="Total Campaigns" value={stats._count?._all || 0} color="primary" />
        <StatCard icon={CheckCircle} label="Campaigns Completed" value={campaigns.filter(c => c.status === 'completed').length} color="green" />
        <StatCard icon={Send} label="Total SMS Sent" value={stats._sum?.sent || 0} color="emerald" />
        <StatCard icon={Users} label="Total Recipients" value={stats._sum?.recipients || 0} color="blue" />
      </div>

      <DataTable columns={columns} data={campaigns} loading={isLoading} emptyMessage="No campaigns yet. Create your first campaign to reach your customers via SMS." />

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New SMS Campaign">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="form-input" placeholder="e.g. July Sale Promotion" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Message *</label>
              <span className={`text-xs ${charCount > 160 ? 'text-amber-600' : 'text-gray-400'}`}>{charCount} chars · {smsCount} SMS</span>
            </div>
            <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={5} className="form-textarea" placeholder="Type your SMS message here…" />
            <p className="text-xs text-gray-400 mt-1">160 characters = 1 SMS. Messages over 160 chars count as multiple SMS.</p>
          </div>
          {saveMutation.isError && <p className="text-red-500 text-sm">{saveMutation.error?.response?.data?.message}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.name || !form.message}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50">
              {saveMutation.isPending ? 'Saving…' : 'Create Campaign (Draft)'}
            </button>
            <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
