import mongoose from 'mongoose'
const poItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: String, sku: String,
  quantity: Number, receivedQuantity: { type: Number, default: 0 },
  unitCost: Number, total: Number,
})
const purchaseOrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  poNumber: { type: String, unique: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  items: [poItemSchema],
  subtotal: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'sent', 'received', 'partially_received', 'cancelled'], default: 'draft' },
  expectedDate: Date, receivedDate: Date,
  notes: String,
}, { timestamps: true })
export default mongoose.model('PurchaseOrder', purchaseOrderSchema)
