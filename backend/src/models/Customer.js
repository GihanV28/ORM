import mongoose from 'mongoose'

const customerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: String,
  address: String,
  city: String,
  district: String,
  postalCode: String,
  status: { type: String, enum: ['active', 'inactive', 'blacklisted'], default: 'active' },
  totalOrders: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  creditBalance: { type: Number, default: 0 },
  notes: String,
}, { timestamps: true })

customerSchema.index({ user: 1, phone: 1 })
customerSchema.index({ user: 1, name: 'text', phone: 'text', email: 'text' })

export default mongoose.model('Customer', customerSchema)
