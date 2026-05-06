const mongoose = require("mongoose");

const portHistorySchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ["add", "edit", "delete"],
    required: true,
  },
  portId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Port",
    default: null,
  },
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
}, { timestamps: true });

module.exports = mongoose.model("PortHistory", portHistorySchema);
