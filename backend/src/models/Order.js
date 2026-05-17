import mongoose from 'mongoose'

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: String,
  sku: String,
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  unitCost: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: Number,
}, { _id: true })

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderNumber: { type: String, unique: true },
  externalOrderId: { type: String, sparse: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  alternativePhone: String,
  customerEmail: String,
  shippingAddress: { type: String, required: true },
  addressLine2: String,
  city: { type: String, required: true },
  district: { type: String, required: true },
  postalCode: String,
  items: [orderItemSchema],
  subtotal: { type: Number, default: 0 },
  shippingCost: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  paymentMethod: { type: String, enum: ['cod', 'cash', 'bank_transfer', 'card', 'online', 'credit'], default: 'cod' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'partially_paid', 'refunded', 'failed', 'cod'], default: 'pending' },
  status: {
    type: String,
    enum: ['open', 'no_answer', 'on_hold', 'confirm', 'dispatched', 'shipped', 'delivered', 'returned', 'refunded', 'damaged', 'cancelled', 'completed'],
    default: 'open'
  },
  notes: String,
  internalNotes: String,
  source: { type: String, enum: ['manual', 'ecommerce', 'pos', 'import'], default: 'manual' },
  assignedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  deliveryCompany: String,
  waybillNumber: String,
  waybillSyncedAt: Date,
  curfoxId: String,
  trackingHistory: [{ status: String, timestamp: Date, note: String }],
  calledAt: Date,
  codCollectedAt: Date,
  codAmount: Number,
  printedAt: Date,
  printedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isPos: { type: Boolean, default: false },
  posSession: { type: mongoose.Schema.Types.ObjectId, ref: 'PosSession' },
}, { timestamps: true })

// Auto-generate order number
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments({ user: this.user })
    const date = new Date()
    const y = date.getFullYear().toString().slice(-2)
    const m = String(date.getMonth() + 1).padStart(2, '0')
    this.orderNumber = `ORD-${this.user.toString().slice(-4).toUpperCase()}-${y}${m}-${String(count + 1).padStart(4, '0')}`
  }
  // Calculate totals
  this.subtotal = this.items.reduce((s, i) => s + i.unitPrice * i.quantity - (i.discount || 0), 0)
  this.totalAmount = Math.max(0, this.subtotal + this.shippingCost - this.discount)
  this.profit = this.items.reduce((s, i) => s + (i.unitPrice - i.unitCost) * i.quantity, 0)
  this.items.forEach(item => { item.total = item.unitPrice * item.quantity - (item.discount || 0) })
  next()
})

export default mongoose.model('Order', orderSchema)
