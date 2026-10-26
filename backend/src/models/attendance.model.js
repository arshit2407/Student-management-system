const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    studentName: { type: String, required: true, trim: true },
    studentRollNo: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['present', 'absent'], required: true }
  },
  { timestamps: true }
);

attendanceSchema.index({ user: 1, group: 1, student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ user: 1, group: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
