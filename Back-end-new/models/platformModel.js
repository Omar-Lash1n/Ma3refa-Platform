
// ============================================
// 8) Platform Settings Schema
// ============================================
const mongoose = require('mongoose');


const platformSettingsSchema = new mongoose.Schema({
  commission_rate: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
    default: 0.1,
  },
  min_withdrawal: {
    type: Number,
    required: true,
    min: 0,
    default: 100,
  },
  payment_gateways: [
    {
      type: String,
      enum: ["stripe", "paypal", "fawry", "vodafone_cash"],
    },
  ],
  currency: {
    type: String,
    default: "EGP",
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
  updated_by: {
    type: String,
    required: true,
  },
});

// Update updated_at on save
platformSettingsSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model("PlatformSettings", platformSettingsSchema);
