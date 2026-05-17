import mongoose from 'mongoose'
const expenseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  paymentMethod: { type: String, enum: ['cash', 'bank_transfer', 'card'], default: 'cash' },
  reference: String, receipt: String,
  notes: String,
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
}, { timestamps: true })
export default mongoose.model('Expense', expenseSchema)
