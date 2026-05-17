export default function Spinner({ size = 'md', className = '' }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }[size]
  return <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${s} ${className}`} />
}
