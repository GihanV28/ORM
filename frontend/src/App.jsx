import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppLayout from './components/layout/AppLayout'
import Spinner from './components/ui/Spinner'

// Auth
import Login from './pages/Login'
import PrintWaybills from './pages/orders/PrintWaybills'
import PrintOrder from './pages/orders/PrintOrder'
import DeliveryOrders from './pages/orders/DeliveryOrders'
import ImportOrders from './pages/orders/ImportOrders'
import EditOrder from './pages/orders/EditOrder'
import SmsUsage from './pages/sms/SmsUsage'
import CourierSettings from './pages/settings/CourierSettings'
import ProductVariants from './pages/products/ProductVariants'
import VariationAttributes from './pages/products/VariationAttributes'
import StockHistory from './pages/stock/StockHistory'
import PosSessions from './pages/pos/PosSessions'
// Core
import Dashboard from './pages/Dashboard'
import OrderList from './pages/orders/OrderList'
import OrderDetail from './pages/orders/OrderDetail'
import CreateOrder from './pages/orders/CreateOrder'
import Products from './pages/Products'
import Stock from './pages/Stock'
import Customers from './pages/Customers'
import Categories from './pages/Categories'
import Suppliers from './pages/Suppliers'
import PurchaseOrders from './pages/PurchaseOrders'
import POS from './pages/POS'
import Returns from './pages/Returns'
// HR
import HRDashboard from './pages/hr/HRDashboard'
import Employees from './pages/hr/Employees'
import Departments from './pages/hr/Departments'
import ActivityTracking from './pages/hr/ActivityTracking'
// Finance
import Expenses from './pages/Expenses'
import BankAccounts from './pages/BankAccounts'
import CashTransfers from './pages/CashTransfers'
import Credit from './pages/Credit'
import SupplierPayments from './pages/SupplierPayments'
// Procurement
import Grn from './pages/Grn'
// Stock sub-pages
import StockAlerts from './pages/stock/StockAlerts'
import BulkAdjust from './pages/stock/BulkAdjust'
// SMS
import SmsCampaigns from './pages/sms/SmsCampaigns'
import SmsContacts from './pages/sms/SmsContacts'
// Settings
import Settings from './pages/Settings'
import Roles from './pages/settings/Roles'
// Reports
import Reports from './pages/Reports'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } }
})

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        {/* Dashboard */}
        <Route index element={<Dashboard />} />
        {/* Orders */}
        <Route path="orders" element={<OrderList />} />
        <Route path="orders/new" element={<CreateOrder />} />
        <Route path="orders/delivery" element={<DeliveryOrders />} />
        <Route path="orders/import" element={<ImportOrders />} />
        <Route path="orders/print-waybills" element={<PrintWaybills />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="orders/:id/edit" element={<EditOrder />} />
        <Route path="orders/:id/print" element={<PrintOrder />} />
        {/* Products & Categories */}
        <Route path="products" element={<Products />} />
        <Route path="products/attributes" element={<VariationAttributes />} />
        <Route path="products/:id/variants" element={<ProductVariants />} />
        <Route path="categories" element={<Categories />} />
        {/* Stock */}
        <Route path="stock" element={<Stock />} />
        <Route path="stock/alerts" element={<StockAlerts />} />
        <Route path="stock/bulk" element={<BulkAdjust />} />
        <Route path="stock/history" element={<StockHistory />} />
        {/* Customers */}
        <Route path="customers" element={<Customers />} />
        {/* POS & Returns */}
        <Route path="pos" element={<POS />} />
        <Route path="pos/sessions" element={<PosSessions />} />
        <Route path="returns" element={<Returns />} />
        {/* Finance */}
        <Route path="expenses" element={<Expenses />} />
        <Route path="bank-accounts" element={<BankAccounts />} />
        <Route path="cash-transfers" element={<CashTransfers />} />
        <Route path="credit" element={<Credit />} />
        {/* Procurement */}
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="grn" element={<Grn />} />
        <Route path="supplier-payments" element={<SupplierPayments />} />
        {/* HR */}
        <Route path="hr" element={<HRDashboard />} />
        <Route path="hr/employees" element={<Employees />} />
        <Route path="hr/departments" element={<Departments />} />
        <Route path="hr/activity" element={<ActivityTracking />} />
        {/* SMS */}
        <Route path="sms/campaigns" element={<SmsCampaigns />} />
        <Route path="sms/contacts" element={<SmsContacts />} />
        <Route path="sms/usage" element={<SmsUsage />} />
        {/* Reports */}
        <Route path="reports" element={<Reports />} />
        {/* Settings */}
        <Route path="settings" element={<Settings />} />
        <Route path="settings/roles" element={<Roles />} />
        <Route path="settings/courier" element={<CourierSettings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: { borderRadius: '12px', fontSize: '14px', fontWeight: 500 },
              success: { style: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' } },
              error: { style: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' } },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
