import mongoose from 'mongoose'

const variantSchema = new mongoose.Schema({
  name: String,
  value: String,
  sku: String,
  price: Number,
  cost: Number,
  stock: { type: Number, default: 0 },
})

const productSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  barcode: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  description: String,
  sellingPrice: { type: Number, required: true },
  costPrice: { type: Number, default: 0 },
  comparePrice: Number,
  status: { type: String, enum: ['active', 'inactive', 'out_of_stock'], default: 'active' },
  hasVariants: { type: Boolean, default: false },
  variants: [variantSchema],
  images: [String],
  weight: Number,
  unit: String,
  minStock: { type: Number, default: 5 },
  batchNumber: String,
  notes: String,
}, { timestamps: true })

productSchema.index({ user: 1, sku: 1 }, { unique: true })
productSchema.index({ user: 1, name: 'text', sku: 'text' })

export default mongoose.model('Product', productSchema)
