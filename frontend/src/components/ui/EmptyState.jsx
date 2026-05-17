export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
        {Icon && <Icon size={36} className="text-gray-400" />}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      {description && <p className="text-gray-500 mb-6 text-sm max-w-sm mx-auto">{description}</p>}
      {action}
    </div>
  )
}
