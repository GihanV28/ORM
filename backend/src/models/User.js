import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  username: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  businessName: String,
  phone: String,
  address: String,
  logo: String,
  failedAttempts: { type: Number, default: 0 },
  lockedUntil: Date,
  lastLogin: Date,
  sessions: [{ token: String, device: String, createdAt: Date, expiresAt: Date }],
  settings: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true })

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12)
  next()
})

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password)
}

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject()
  delete obj.password
  delete obj.sessions
  return obj
}

export default mongoose.model('User', userSchema)
