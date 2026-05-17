import 'express-async-errors'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import { errorHandler } from './middleware/errorHandler.js'

// Routes
import authRoutes from './routes/auth.js'
import dashboardRoutes from './routes/dashboard.js'
import orderRoutes from './routes/orders.js'
import productRoutes from './routes/products.js'
import stockRoutes from './routes/stock.js'
import customerRoutes from './routes/customers.js'
import supplierRoutes from './routes/suppliers.js'
import purchaseOrderRoutes from './routes/purchaseOrders.js'
import posRoutes from './routes/pos.js'
import returnRoutes from './routes/returns.js'
import hrRoutes from './routes/hr.js'
import expenseRoutes from './routes/expenses.js'
import cashRoutes from './routes/cash.js'
import reportRoutes from './routes/reports.js'
import settingsRoutes from './routes/settings.js'
import categoryRoutes from './routes/categories.js'
import apiRoutes from './routes/api.js'
import externalRoutes from './routes/external.js'
import webhookRoutes from './routes/webhooks.js'
import bankAccountRoutes from './routes/bankAccounts.js'
import cashTransferRoutes from './routes/cashTransfers.js'
import grnRoutes from './routes/grn.js'
import supplierPaymentRoutes from './routes/supplierPayments.js'
import creditRoutes from './routes/credit.js'
import activityRoutes from './routes/activity.js'
import variantRoutes from './routes/variants.js'
import attributeRoutes from './routes/attributes.js'
import smsRoutes from './routes/sms.js'

dotenv.config()

const app = express()

app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(morgan('dev'))

app.use('/api/auth', authRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/products', productRoutes)
app.use('/api/stock', stockRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/suppliers', supplierRoutes)
app.use('/api/purchase-orders', purchaseOrderRoutes)
app.use('/api/pos', posRoutes)
app.use('/api/returns', returnRoutes)
app.use('/api/hr', hrRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/cash', cashRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/internal', apiRoutes)
app.use('/api/v1/external', externalRoutes)
app.use('/api/webhooks', webhookRoutes)
app.use('/api/bank-accounts', bankAccountRoutes)
app.use('/api/cash-transfers', cashTransferRoutes)
app.use('/api/grn', grnRoutes)
app.use('/api/supplier-payments', supplierPaymentRoutes)
app.use('/api/credit', creditRoutes)
app.use('/api/activity', activityRoutes)
app.use('/api/sms', smsRoutes)
app.use('/api/products/:productId/variants', variantRoutes)
app.use('/api/attributes', attributeRoutes)
app.use('/api/reports/outstanding/customers', reportRoutes)
app.use('/api/reports/outstanding/suppliers', reportRoutes)

app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date() }))

app.use(errorHandler)

// Local dev server (not used on Vercel — Vercel imports `app` directly)
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5000
  app.listen(PORT, () => console.log(`ORM Backend running on port ${PORT} (PostgreSQL/Supabase)`))
}

export default app
