export default function StatCard({ icon: Icon, label, value, color = 'primary', sub, gradient }) {
  const colors = {
    primary: { bg: 'bg-primary-100', text: 'text-primary-600', val: 'text-primary-600' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', val: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600', val: 'text-green-600' },
    red: { bg: 'bg-red-100', text: 'text-red-600', val: 'text-red-600' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600', val: 'text-amber-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', val: 'text-purple-600' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', val: 'text-emerald-600' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', val: 'text-orange-600' },
  }
  const c = colors[color] || colors.primary

  if (gradient) {
    const gradients = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      red: 'from-red-500 to-red-600',
      amber: 'from-amber-500 to-amber-600',
      purple: 'from-purple-500 to-purple-600',
      primary: 'from-primary-500 to-primary-600',
      emerald: 'from-emerald-500 to-emerald-600',
    }
    return (
      <div className={`bg-gradient-to-br ${gradients[gradient] || gradients.primary} rounded-2xl p-5 text-white shadow-lg`}>
        <div className="flex items-center justify-between mb-3">
          {Icon && <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Icon size={18} /></div>}
        </div>
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-white/80 text-sm mt-1">{label}</p>
        {sub && <p className="text-white/60 text-xs mt-1">{sub}</p>}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`text-2xl font-bold ${c.val} mt-1`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {Icon && (
          <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center`}>
            <Icon size={20} className={c.text} />
          </div>
        )}
      </div>
    </div>
  )
}
