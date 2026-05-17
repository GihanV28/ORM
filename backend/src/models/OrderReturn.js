import mongoose from 'mongoose'
const returnItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: String, sku: String,
  quantity: Number, unitPrice: Number,
  reason: String, condition: { type: String, enum: ['good', 'damaged', 'defective'], default: 'good' },
})
const orderReturnSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  returnNumber: String,
  type: { type: String, enum: ['return', 'damage', 'exchange'], default: 'return' },
  items: [returnItemSchema],
  totalAmount: { type: Number, default: 0 },
  refundAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' },
  restockItems: { type: Boolean, default: true },
  notes: String,
}, { timestamps: true })
export default mongoose.model('OrderReturn', orderReturnSchema)
