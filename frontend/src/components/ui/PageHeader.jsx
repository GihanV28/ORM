export default function PageHeader({ icon: Icon, title, subtitle, gradient = 'from-primary-600 to-primary-700', actions }) {
  return (
    <div className={`bg-gradient-to-r ${gradient} rounded-2xl p-6 text-white shadow-xl shadow-primary-500/20 mb-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            {Icon && (
              <span className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <Icon size={20} />
              </span>
            )}
            {title}
          </h1>
          {subtitle && <p className="text-white/70 mt-1 text-sm ml-[52px]">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
      </div>
    </div>
  )
}
