
// ============================================
// 4) Subject Schema
// ============================================

const subjectSchema = new mongoose.Schema({
  subject_name: {
    type: String,
    required: [true, "Subject name is required"],
    unique: true,
    trim: true,
    minlength: [2, "Subject name must be at least 2 characters"],
    maxlength: [100, "Subject name must be less than 100 characters"],
  },
  description: {
    type: String,
    maxlength: [500, "Description must be less than 500 characters"],
    default: null,
  },
  icon_url: {
    type: String,
    default: null,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Subject", subjectSchema);
