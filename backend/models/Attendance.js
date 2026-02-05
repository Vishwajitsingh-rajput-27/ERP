const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  timeIn: { type: Date, default: Date.now },
  timeOut: Date,
  status: { type: String, enum: ['Present', 'Absent', 'Late'], default: 'Present' },
  notes: String,
  dayOfMonth: { type: Number, required: true } // 1-31 for monthly tracking
}, { timestamps: true });

attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
