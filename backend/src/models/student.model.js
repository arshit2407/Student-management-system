const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    rollNo: { type: String, required: true, match: /^\d+$/ }
  },
  { timestamps: true }
);

studentSchema.index({ user: 1, group: 1, email: 1 }, { unique: true });
studentSchema.index({ user: 1, rollNo: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);
