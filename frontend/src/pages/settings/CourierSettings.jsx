import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import PageHeader from '../../components/ui/PageHeader'
import { Truck, Save, Eye, EyeOff, ExternalLink } from 'lucide-react'

export default function CourierSettings() {
  const [showApiKey, setShowApiKey] = useState(false)

  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data.data.user),
  })

  const courierSettings = data?.settings || {}
  const [form, setForm] = useState({
    fardarClientId: courierSettings.fardarClientId || '',
    fardarApiKey: courierSettings.fardarApiKey || '',
    defaultCourier: courierSettings.defaultCourier || 'Fardar Express',
    defaultDeliveryFee: courierSettings.defaultDeliveryFee || '',
    webhookUrl: '',
  })

  const saveMutation = useMutation({
    mutationFn: (settings) => api.put('/settings', { settings }),
    onSuccess: () => toast.success('Courier settings saved'),
    onError: () => toast.error('Failed to save settings'),
  })

  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  const webhookUrl = `${backendUrl}/api/webhooks/fardar`

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const SectionCard = ({ title, children }) => (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <PageHeader icon={Truck} title="Courier Settings" subtitle="Configure delivery service integrations"
        gradient="from-orange-500 to-red-600" />

      {/* Fardar Express */}
      <SectionCard title="Fardar Express Domestic (FED)">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-5">
          <p className="text-sm font-medium text-blue-800">Your Fardar API Credentials</p>
          <p className="text-xs text-blue-600 mt-1">
            Find these at{' '}
            <a href="https://www.fdedomestic.com/client/welcome.php" target="_blank" rel="noopener noreferrer"
              className="underline font-medium">fdedomestic.com → API section</a>
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
              <input value={form.fardarClientId} onChange={e => f('fardarClientId', e.target.value)}
                className="form-input" placeholder="e.g. 18266" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <div className="relative">
                <input type={showApiKey ? 'text' : 'password'} value={form.fardarApiKey}
                  onChange={e => f('fardarApiKey', e.target.value)}
                  className="form-input pr-10" placeholder="Your FED API key" />
                <button onClick={() => setShowApiKey(s => !s)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Delivery Fee (LKR)</label>
            <input type="number" value={form.defaultDeliveryFee} onChange={e => f('defaultDeliveryFee', e.target.value)}
              className="form-input" placeholder="0" />
            <p className="text-xs text-gray-400 mt-1">Auto-filled in new orders</p>
          </div>

          <button onClick={() => saveMutation.mutate({ ...courierSettings, ...form })}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm">
            <Save size={15} /> {saveMutation.isPending ? 'Saving…' : 'Save Fardar Settings'}
          </button>
        </div>
      </SectionCard>

      {/* Webhook URL */}
      <SectionCard title="Delivery Status Webhook">
        <p className="text-sm text-gray-600 mb-4">
          Configure this URL in your Fardar portal (API → Reverse API) so FED can push delivery status
          updates back to your ORM automatically.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your Webhook URL</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono text-gray-700 break-all">
              {webhookUrl}
            </code>
            <button onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Copied!') }}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap">
              Copy
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            ⚠️ This URL only works after you deploy the ORM backend to a public server.
          </p>
        </div>

        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm font-medium text-amber-800 mb-1">Currently configured in FED portal:</p>
          <code className="text-xs text-amber-700 break-all">
            https://adumculture.online/api/v1/webhook/delivery?token=9d1993d501426c2616b7f03045e5f989&user=16
          </code>
          <p className="text-xs text-amber-600 mt-2">Update this to your new webhook URL once the ORM backend is deployed.</p>
        </div>

        <a href="https://www.fdedomestic.com/client/welcome.php" target="_blank" rel="noopener noreferrer"
          className="mt-4 flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors w-fit">
          <ExternalLink size={14} /> Open FED Portal to Update Webhook
        </a>
      </SectionCard>
    </div>
  )
}
