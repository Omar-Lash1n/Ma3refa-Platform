
// ============================================
// 10) Review Schema
// ============================================

const reviewSchema = new mongoose.Schema({
  course_id: {
    type: String,
    required: [true, "Course ID is required"],
  },
  student_id: {
    type: String,
    required: [true, "Student ID is required"],
  },
  teacher_id: {
    type: String,
    required: [true, "Teacher ID is required"],
  },
  rating: {
    type: Number,
    required: [true, "Rating is required"],
    min: [1, "Rating must be at least 1"],
    max: [5, "Rating must be at most 5"],
  },
  comment: {
    type: String,
    maxlength: [1000, "Comment must be less than 1000 characters"],
    default: null,
  },
  is_approved: {
    type: Boolean,
    default: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Review", reviewSchema);