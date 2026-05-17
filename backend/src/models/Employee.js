import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const employeeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  password: { type: String, required: true },
  employeeId: String,
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  role: String,
  status: { type: String, enum: ['active', 'inactive', 'probation', 'terminated', 'resigned'], default: 'active' },
  joinDate: Date,
  salary: Number,
  address: String,
  emergencyContact: String,
  permissions: { type: [String], default: [] },
  notes: String,
}, { timestamps: true })

employeeSchema.pre('save', async function (next) {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12)
  next()
})

employeeSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password)
}

export default mongoose.model('Employee', employeeSchema)
