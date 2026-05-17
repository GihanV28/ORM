import mongoose from 'mongoose'
const activityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, refPath: 'actorModel' },
  actorModel: { type: String, enum: ['User', 'Employee'] },
  actorName: String,
  action: { type: String, required: true },
  model: String,
  recordId: String,
  changes: mongoose.Schema.Types.Mixed,
  ip: String,
  userAgent: String,
}, { timestamps: true })
export default mongoose.model('ActivityLog', activityLogSchema)
