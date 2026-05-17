import mongoose from 'mongoose'
const departmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: String,
}, { timestamps: true })
export default mongoose.model('Department', departmentSchema)
