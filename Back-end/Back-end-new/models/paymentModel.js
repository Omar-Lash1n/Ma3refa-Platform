
// ============================================
// 6) Payment Schema
// ============================================
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  student_id: {
    type: String,
    required: [true, "Student ID is required"],
  },
  teacher_id: {
    type: String,
    required: [true, "Teacher ID is required"],
  },
  amount: {
    type: Number,
    required: [true, "Amount is required"],
    min: [0, "Amount cannot be negative"],
  },
  payment_date: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["Pending", "Successful", "Failed", "Refunded"],
    default: "Pending",
  },
  gateway_ref: {
    type: String,
    default: null,
  },
  payment_method: {
    type: String,
    enum: ["credit_card", "paypal", "fawry", "vodafone_cash", "other"],
    required: [true, "Payment method is required"],
  },
  commission_rate: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
  },
  platform_commission: {
    type: Number,
    required: true,
    min: 0,
  },
  net_to_teacher: {
    type: Number,
    required: true,
    min: 0,
  },
  transferred_to_teacher: {
    type: Boolean,
    default: false,
  },
  transfer_date: {
    type: Date,
    default: null,
  },
  purchased_sections: [
    {
      section_id: {
        type: String,
        required: true,
      },
      course_id: {
        type: String,
        required: true,
      },
      section_price: {
        type: Number,
        required: true,
        min: 0,
      },
    },
  ],
});

module.exports = mongoose.model("Payment", paymentSchema);
