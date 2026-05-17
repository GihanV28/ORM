import mongoose from 'mongoose'
const posSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  openingCash: { type: Number, default: 0 },
  closingCash: Number,
  totalSales: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  openedAt: { type: Date, default: Date.now },
  closedAt: Date,
  notes: String,
}, { timestamps: true })
export default mongoose.model('PosSession', posSessionSchema)
