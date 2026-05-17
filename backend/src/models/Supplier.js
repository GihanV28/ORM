import mongoose from 'mongoose'
const supplierSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  phone: String,
  email: String,
  address: String,
  city: String,
  district: String,
  contactPerson: String,
  bankAccount: String,
  bankName: String,
  totalOwed: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  notes: String,
}, { timestamps: true })
export default mongoose.model('Supplier', supplierSchema)
