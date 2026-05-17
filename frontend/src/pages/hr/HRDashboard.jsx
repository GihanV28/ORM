import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { formatCurrency, formatDate } from '../../lib/utils'
import PageHeader from '../../components/ui/PageHeader'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import { Link } from 'react-router-dom'
import { Users, UserCheck, Building2, Activity, TrendingUp, DollarSign } from 'lucide-react'

export default function HRDashboard() {
  const { data: empData, isLoading: empLoading } = useQuery({ queryKey: ['employees'], queryFn: () => api.get('/hr/employees').then(r => r.data.data) })
  const { data: deptData } = useQuery({ queryKey: ['departments'], queryFn: () => api.get('/hr/departments').then(r => r.data.data) })
  const { data: activityData } = useQuery({ queryKey: ['activity', { limit: 10 }], queryFn: () => api.get('/activity', { params: { limit: 10 } }).then(r => r.data.data) })

  const employees = empData?.employees || []
  const departments = deptData?.departments || []
  const logs = activityData?.logs || []

  const activeEmp = employees.filter(e => e.status === 'active')
  const totalSalary = activeEmp.reduce((s, e) => s + (e.salary || 0), 0)

  if (empLoading) return <div className="flex justify-center items-center h-64"><Spinner size="lg" /></div>

  return (
    <div className="p-6 space-y-6">
      <PageHeader icon={UserCheck} title="HR Dashboard" subtitle="Human resources overview and management"
        gradient="from-rose-600 via-pink-700 to-purple-800"
        actions={
          <div className="flex gap-2">
            <Link to="/hr/employees" className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium transition-colors"><Users size={15} /> Employees</Link>
            <Link to="/hr/departments" className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium transition-colors"><Building2 size={15} /> Departments</Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Employees" value={employees.length} color="primary" />
        <StatCard icon={UserCheck} label="Active" value={activeEmp.length} color="green" />
        <StatCard icon={Building2} label="Departments" value={departments.length} color="purple" />
        <StatCard icon={DollarSign} label="Monthly Payroll" value={formatCurrency(totalSalary)} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employees list */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Employees</h2>
            <Link to="/hr/employees" className="text-sm text-primary-600 hover:underline">View all →</Link>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Salary</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {employees.slice(0, 8).map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center text-primary-700 font-bold text-xs">
                        {emp.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{emp.name}</p>
                        <p className="text-xs text-gray-400">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-gray-600">{emp.role || '—'}</td>
                  <td className="px-6 py-3 text-gray-600">{emp.department?.name || '—'}</td>
                  <td className="px-6 py-3"><Badge status={emp.status} /></td>
                  <td className="px-6 py-3 text-right font-medium text-gray-800">{emp.salary ? formatCurrency(emp.salary) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Departments */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Departments</h2>
            <Link to="/hr/departments" className="text-sm text-primary-600 hover:underline">Manage →</Link>
          </div>
          {departments.length === 0 ? <p className="text-gray-400 text-sm">No departments created.</p> : (
            <div className="space-y-3">
              {departments.map(dept => (
                <div key={dept.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center"><Building2 size={16} className="text-purple-600" /></div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{dept.name}</p>
                      {dept.description && <p className="text-xs text-gray-400">{dept.description}</p>}
                    </div>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-1 font-medium">{dept._count?.employees || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Activity size={16} className="text-primary-600" /> Recent Activity</h2>
          <Link to="/hr/activity" className="text-sm text-primary-600 hover:underline">View all →</Link>
        </div>
        {logs.length === 0 ? <p className="text-gray-400 text-sm">No activity recorded yet.</p> : (
          <div className="space-y-3">
            {logs.map(log => (
              <div key={log.id} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center shrink-0"><Activity size={14} className="text-primary-600" /></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800"><span className="font-medium">{log.actorName || 'System'}</span> {log.action}</p>
                  {log.model && <p className="text-xs text-gray-400">{log.model} {log.recordId ? `#${log.recordId.slice(-6)}` : ''}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(log.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
