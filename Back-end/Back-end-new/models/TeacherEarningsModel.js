// ============================================
// 7) Teacher Earnings Schema
// ============================================
const mongoose = require('mongoose');


const teacherEarningsSchema = new mongoose.Schema({
  teacher_id: {
    type: String,
    required: [true, "Teacher ID is required"],
    unique: true,
  },
  total_earned: {
    type: Number,
    default: 0,
    min: 0,
  },
  total_withdrawn: {
    type: Number,
    default: 0,
    min: 0,
  },
  available_balance: {
    type: Number,
    default: 0,
    min: 0,
  },
  pending_balance: {
    type: Number,
    default: 0,
    min: 0,
  },
  last_updated: {
    type: Date,
    default: Date.now,
  },
  withdrawal_history: [
    {
      withdrawal_id: {
        type: String,
        required: true,
      },
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
      request_date: {
        type: Date,
        default: Date.now,
      },
      transfer_date: {
        type: Date,
        default: null,
      },
      status: {
        type: String,
        enum: ["Pending", "Completed", "Rejected"],
        default: "Pending",
      },
      method: {
        type: String,
        enum: ["bank_transfer", "paypal", "vodafone_cash", "other"],
        required: true,
      },
      bank_details: {
        account_number: String,
        bank_name: String,
        account_holder_name: String,
      },
      rejection_reason: {
        type: String,
        default: null,
      },
    },
  ],
});

// Update last_updated on save
teacherEarningsSchema.pre("save", function (next) {
  this.last_updated = Date.now();
  next();
});

module.exports = mongoose.model("TeacherEarnings", teacherEarningsSchema);

