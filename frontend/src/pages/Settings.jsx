import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import toast from 'react-hot-toast'
import PageHeader from '../components/ui/PageHeader'
import { Save, Eye, EyeOff, Copy, Settings as SettingsIcon, Truck, Printer, Package } from 'lucide-react'

const CURRENCIES = ['LKR', 'USD', 'EUR', 'GBP']
const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY']
const TIMEZONES = ['Asia/Colombo', 'UTC', 'Asia/Dubai', 'Asia/Singapore']
const COURIERS = ['Fardar Express', 'Curfox', 'Other']

const SectionCard = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
      {Icon && <Icon size={16} className="text-primary-600" />}
      <h2 className="font-semibold text-gray-900">{title}</h2>
    </div>
    <div className="p-6">{children}</div>
  </div>
)

export default function Settings() {
  const { user, setUser } = useAuth()
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [profile, setProfile] = useState({ name: '', businessName: '', phone: '', address: '' })
  const [appSettings, setAppSettings] = useState({
    orderPrefix: 'ORD',
    defaultDeliveryFee: '',
    defaultCourier: 'Fardar Express',
    lowStockThreshold: '5',
    autoConfirmOrders: false,
    currency: 'LKR',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Asia/Colombo',
  })
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data.data.user),
    onSuccess: (u) => {
      setProfile({ name: u.name || '', businessName: u.businessName || '', phone: u.phone || '', address: u.address || '' })
      if (u.settings) {
        setAppSettings(s => ({ ...s, ...u.settings }))
      }
    }
  })

  useEffect(() => {
    if (data) {
      setProfile({ name: data.name || '', businessName: data.businessName || '', phone: data.phone || '', address: data.address || '' })
      if (data.settings) setAppSettings(s => ({ ...s, ...data.settings }))
    }
  }, [data])

  const apiKey = data?.apiKey || user?.apiKey || ''

  const profileMutation = useMutation({
    mutationFn: (d) => api.put('/settings', d),
    onSuccess: (res) => { setUser(res.data.data.user); toast.success('Profile saved') }
  })

  const settingsMutation = useMutation({
    mutationFn: (settings) => api.put('/settings', { settings }),
    onSuccess: () => toast.success('Settings saved')
  })

  const pwMutation = useMutation({
    mutationFn: (d) => api.post('/auth/change-password', d),
    onSuccess: () => { setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); toast.success('Password updated') },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to update password')
  })

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inputCls = 'form-input'
  const pf = (k, v) => setProfile(p => ({ ...p, [k]: v }))
  const sf = (k, v) => setAppSettings(s => ({ ...s, [k]: v }))

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <PageHeader icon={SettingsIcon} title="Settings" subtitle="Configure your business preferences" gradient="from-slate-600 to-gray-700" />

      {/* Business Profile */}
      <SectionCard title="Business Profile" icon={Package}>
        <div className="grid grid-cols-2 gap-4">
          {[['name','Your Name'],['businessName','Business Name'],['phone','Phone Number']].map(([key, label]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input value={profile[key]} onChange={e => pf(key, e.target.value)} className={inputCls} />
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
            <textarea value={profile.address} onChange={e => pf('address', e.target.value)} rows={2} className="form-textarea" />
          </div>
        </div>
        <button onClick={() => profileMutation.mutate(profile)} disabled={profileMutation.isPending}
          className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 shadow-sm shadow-primary-500/25">
          <Save size={15} /> {profileMutation.isPending ? 'Saving…' : 'Save Profile'}
        </button>
      </SectionCard>

      {/* Order Settings */}
      <SectionCard title="Order Settings" icon={Package}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order Number Prefix</label>
            <input value={appSettings.orderPrefix} onChange={e => sf('orderPrefix', e.target.value)} className={inputCls} placeholder="ORD" />
            <p className="text-xs text-gray-400 mt-1">Orders will be numbered: {appSettings.orderPrefix || 'ORD'}-AC-YYMM-0001</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Delivery Fee (LKR)</label>
            <input type="number" value={appSettings.defaultDeliveryFee} onChange={e => sf('defaultDeliveryFee', e.target.value)} className={inputCls} placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert Threshold</label>
            <input type="number" value={appSettings.lowStockThreshold} onChange={e => sf('lowStockThreshold', e.target.value)} className={inputCls} placeholder="5" />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={appSettings.autoConfirmOrders} onChange={e => sf('autoConfirmOrders', e.target.checked)} className="w-4 h-4 rounded" />
              <div>
                <p className="text-sm font-medium text-gray-700">Auto-confirm new orders</p>
                <p className="text-xs text-gray-400">Skip the 'Open' status for new orders</p>
              </div>
            </label>
          </div>
        </div>
        <button onClick={() => settingsMutation.mutate(appSettings)} disabled={settingsMutation.isPending}
          className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 shadow-sm">
          <Save size={15} /> {settingsMutation.isPending ? 'Saving…' : 'Save Order Settings'}
        </button>
      </SectionCard>

      {/* Delivery Settings */}
      <SectionCard title="Delivery Settings" icon={Truck}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Courier</label>
            <select value={appSettings.defaultCourier} onChange={e => sf('defaultCourier', e.target.value)} className="form-select">
              {COURIERS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <button onClick={() => settingsMutation.mutate(appSettings)} disabled={settingsMutation.isPending}
          className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 shadow-sm">
          <Save size={15} /> {settingsMutation.isPending ? 'Saving…' : 'Save Delivery Settings'}
        </button>
      </SectionCard>

      {/* Regional Settings */}
      <SectionCard title="Regional & Display" icon={SettingsIcon}>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select value={appSettings.currency} onChange={e => sf('currency', e.target.value)} className="form-select">
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
            <select value={appSettings.dateFormat} onChange={e => sf('dateFormat', e.target.value)} className="form-select">
              {DATE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
            <select value={appSettings.timezone} onChange={e => sf('timezone', e.target.value)} className="form-select">
              {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <button onClick={() => settingsMutation.mutate(appSettings)} disabled={settingsMutation.isPending}
          className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 shadow-sm">
          <Save size={15} /> {settingsMutation.isPending ? 'Saving…' : 'Save Regional Settings'}
        </button>
      </SectionCard>

      {/* API Key */}
      <SectionCard title="External API Key" icon={SettingsIcon}>
        <p className="text-sm text-gray-500 mb-3">Use this key to send orders from your website to the ORM via the external API.</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono text-gray-700">
            {showKey ? apiKey : apiKey ? '•'.repeat(Math.min(apiKey.length, 48)) : 'No API key found'}
          </code>
          <button onClick={() => setShowKey(s => !s)} className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">{showKey ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          <button onClick={copyKey} className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"><Copy size={18} /></button>
        </div>
        {copied && <p className="text-green-600 text-xs mt-1">✓ Copied to clipboard</p>}
      </SectionCard>

      {/* Change Password */}
      <SectionCard title="Change Password" icon={SettingsIcon}>
        <div className="space-y-3">
          {[['currentPassword','Current Password'],['newPassword','New Password'],['confirmPassword','Confirm Password']].map(([key, label]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input type="password" value={pwForm[key]} onChange={e => setPwForm(p => ({ ...p, [key]: e.target.value }))} className={inputCls} />
            </div>
          ))}
          <button onClick={() => {
            if (pwForm.newPassword !== pwForm.confirmPassword) return toast.error('Passwords do not match')
            if (pwForm.newPassword.length < 8) return toast.error('Password must be at least 8 characters')
            pwMutation.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
          }} disabled={pwMutation.isPending || !pwForm.currentPassword || !pwForm.newPassword}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
            {pwMutation.isPending ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </SectionCard>
    </div>
  )
}
