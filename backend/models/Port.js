const mongoose = require("mongoose");

const portSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  port: {
    type: Number,
    required: true,
    min: 1,
    max: 65535,
  },
  isActive: {
    type: String,
    enum: ["unknown", "active", "inactive"],
    default: "unknown",
  },
  lastCheckedAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model("Port", portSchema);