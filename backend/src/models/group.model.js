const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

groupSchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Group', groupSchema);
