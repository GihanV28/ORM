import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, ShoppingCart, Package, BarChart2, Users, Truck,
  ClipboardList, Monitor, RotateCcw, UserCheck, DollarSign, TrendingUp,
  Settings, LogOut, ChevronDown, Tag, Layers, MessageSquare, Building2,
  ArrowLeftRight, FileText, CreditCard, AlertTriangle, Activity,
  ShieldCheck, Printer, Import, Warehouse
} from 'lucide-react'

const NavItem = ({ to, icon: Icon, label, end = false, badge }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
        isActive
          ? 'bg-white text-primary-700 shadow-sm'
          : 'text-white/80 hover:bg-white/10 hover:text-white'
      }`
    }
  >
    <span className="flex items-center gap-2.5">
      <Icon size={16} className="shrink-0" />
      {label}
    </span>
    {badge && <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 font-semibold">{badge}</span>}
  </NavLink>
)

const NavGroup = ({ icon: Icon, label, children, paths = [] }) => {
  const location = useLocation()
  const isAnyActive = paths.some(p => location.pathname.startsWith(p))
  const [open, setOpen] = useState(isAnyActive)

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
          isAnyActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
        }`}
      >
        <span className="flex items-center gap-2.5">
          <Icon size={16} className="shrink-0" />
          {label}
        </span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="ml-3 mt-1 space-y-0.5 border-l border-white/20 pl-3">
          {children}
        </div>
      )}
    </div>
  )
}

const Divider = ({ label }) => (
  <div className="px-3 pt-3 pb-1">
    <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">{label}</p>
  </div>
)

export default function Sidebar() {
  const { user, logout } = useAuth()
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'AC'

  return (
    <aside className="sidebar w-[260px] min-h-screen bg-primary-600 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-primary-600 font-bold text-sm">AC</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Adum Culture</p>
            <p className="text-white/60 text-xs mt-0.5">Order Management</p>
          </div>
        </div>
      </div>

      {/* User Card */}
      <div className="px-3 py-3 border-b border-white/20">
        <div className="flex items-center gap-2.5 bg-white/10 rounded-xl px-3 py-2.5">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="overflow-hidden">
            <p className="text-white text-xs font-semibold truncate">{user?.name || 'Admin'}</p>
            <p className="text-white/60 text-xs truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <NavItem to="/" end icon={LayoutDashboard} label="Dashboard" />

        <Divider label="Operations" />

        <NavGroup icon={ShoppingCart} label="Orders" paths={['/orders']}>
          <NavItem to="/orders" end icon={ShoppingCart} label="All Orders" />
          <NavItem to="/orders/delivery" icon={Truck} label="Delivery Orders" />
          <NavItem to="/orders/import" icon={Import} label="Import Orders" />
          <NavItem to="/orders/print-waybills" icon={Printer} label="Print Waybills" />
        </NavGroup>

        <NavItem to="/returns" icon={RotateCcw} label="Returns & Damages" />

        <NavGroup icon={Package} label="Products" paths={['/products', '/categories', '/products/attributes']}>
          <NavItem to="/products" icon={Package} label="All Products" />
          <NavItem to="/categories" icon={Layers} label="Categories" />
          <NavItem to="/products/attributes" icon={Tag} label="Variation Attributes" />
        </NavGroup>

        <NavGroup icon={BarChart2} label="Stock" paths={['/stock']}>
          <NavItem to="/stock" end icon={BarChart2} label="Stock Levels" />
          <NavItem to="/stock/alerts" icon={AlertTriangle} label="Low Stock Alerts" />
          <NavItem to="/stock/bulk" icon={Warehouse} label="Bulk Adjust" />
          <NavItem to="/stock/history" icon={Activity} label="Stock History" />
        </NavGroup>

        <NavItem to="/customers" icon={Users} label="Customers" />
        <NavGroup icon={Monitor} label="POS" paths={['/pos']}>
          <NavItem to="/pos" end icon={Monitor} label="Counter" />
          <NavItem to="/pos/sessions" icon={ClipboardList} label="Sessions" />
        </NavGroup>

        <Divider label="Finance" />

        <NavGroup icon={DollarSign} label="Cash & Bank" paths={['/bank-accounts', '/cash-transfers']}>
          <NavItem to="/bank-accounts" icon={Building2} label="Bank Accounts" />
          <NavItem to="/cash-transfers" icon={ArrowLeftRight} label="Cash Transfers" />
        </NavGroup>

        <NavItem to="/expenses" icon={DollarSign} label="Expenses" />
        <NavItem to="/credit" icon={CreditCard} label="Credit Management" />

        <Divider label="Procurement" />

        <NavGroup icon={Truck} label="Procurement" paths={['/suppliers', '/purchase-orders', '/grn', '/supplier-payments']}>
          <NavItem to="/suppliers" icon={Truck} label="Suppliers" />
          <NavItem to="/purchase-orders" icon={ClipboardList} label="Purchase Orders" />
          <NavItem to="/grn" icon={FileText} label="GRN" />
          <NavItem to="/supplier-payments" icon={DollarSign} label="Supplier Payments" />
        </NavGroup>

        <Divider label="HR" />

        <NavGroup icon={UserCheck} label="HR" paths={['/hr']}>
          <NavItem to="/hr" end icon={TrendingUp} label="HR Dashboard" />
          <NavItem to="/hr/employees" icon={UserCheck} label="Employees" />
          <NavItem to="/hr/departments" icon={Users} label="Departments" />
          <NavItem to="/hr/activity" icon={Activity} label="Activity Tracking" />
        </NavGroup>

        <Divider label="Communication" />

        <NavGroup icon={MessageSquare} label="SMS" paths={['/sms']}>
          <NavItem to="/sms/campaigns" icon={MessageSquare} label="Campaigns" />
          <NavItem to="/sms/contacts" icon={Users} label="Contacts" />
          <NavItem to="/sms/usage" icon={BarChart2} label="Usage" />
        </NavGroup>

        <Divider label="System" />

        <NavItem to="/reports" icon={TrendingUp} label="Reports" />

        <NavGroup icon={Settings} label="Settings" paths={['/settings']}>
          <NavItem to="/settings" end icon={Settings} label="General" />
          <NavItem to="/settings/roles" icon={ShieldCheck} label="Roles & Permissions" />
          <NavItem to="/settings/courier" icon={Truck} label="Courier Settings" />
        </NavGroup>
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/20">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </aside>
  )
}
