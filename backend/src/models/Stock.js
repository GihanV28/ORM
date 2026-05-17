import mongoose from 'mongoose'

const stockMovementSchema = new mongoose.Schema({
  type: { type: String, enum: ['in', 'out', 'adjust', 'return'] },
  quantity: Number,
  reference: String,
  referenceId: mongoose.Schema.Types.ObjectId,
  note: String,
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
})

const stockSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: false },
  quantity: { type: Number, default: 0 },
  reservedQuantity: { type: Number, default: 0 },
  movements: [stockMovementSchema],
}, { timestamps: true })

stockSchema.index({ user: 1, product: 1 }, { unique: true })

stockSchema.methods.availableQuantity = function () {
  return this.quantity - this.reservedQuantity
}

export default mongoose.model('Stock', stockSchema)
