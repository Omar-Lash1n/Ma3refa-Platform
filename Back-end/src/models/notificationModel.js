
// ============================================
// 9) Notification Schema
// ============================================

const notificationSchema = new mongoose.Schema({
  recipient_id: {
    type: String,
    required: [true, "Recipient ID is required"],
  },
  recipient_type: {
    type: String,
    enum: ["Teacher", "Student", "Admin"],
    required: [true, "Recipient type is required"],
  },
  type: {
    type: String,
    enum: [
      "approval_status",
      "payment",
      "new_student",
      "withdrawal",
      "course_update",
      "system",
    ],
    required: [true, "Notification type is required"],
  },
  title: {
    type: String,
    required: [true, "Title is required"],
    maxlength: [200, "Title must be less than 200 characters"],
  },
  message: {
    type: String,
    required: [true, "Message is required"],
    maxlength: [1000, "Message must be less than 1000 characters"],
  },
  is_read: {
    type: Boolean,
    default: false,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Notification", notificationSchema);
