
// ============================================
// 5) Course Schema
// ============================================
const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  teacher_id: {
    type: String,
    required: [true, "Teacher ID is required"],
  },
  subject_id: {
    type: String,
    required: [true, "Subject ID is required"],
  },
  title: {
    type: String,
    required: [true, "Course title is required"],
    trim: true,
    minlength: [5, "Title must be at least 5 characters"],
    maxlength: [200, "Title must be less than 200 characters"],
  },
  description: {
    type: String,
    required: [true, "Description is required"],
    minlength: [20, "Description must be at least 20 characters"],
    maxlength: [2000, "Description must be less than 2000 characters"],
  },
  cover_image_url: {
    type: String,
    default: null,
  },
  level: {
    type: String,
    enum: ["Beginner", "Intermediate", "Advanced"],
    required: [true, "Course level is required"],
  },
  is_published: {
    type: Boolean,
    default: false,
  },
  sections: [
    {
      section_id: {
        type: String,
        required: true,
      },
      title: {
        type: String,
        required: [true, "Section title is required"],
        trim: true,
        minlength: [3, "Section title must be at least 3 characters"],
        maxlength: [200, "Section title must be less than 200 characters"],
      },
      description: {
        type: String,
        maxlength: [1000, "Section description must be less than 1000 characters"],
        default: null,
      },
      price: {
        type: Number,
        required: [true, "Section price is required"],
        min: [0, "Price cannot be negative"],
      },
      sort_order: {
        type: Number,
        required: true,
        min: 1,
      },
      is_active: {
        type: Boolean,
        default: true,
      },
      lessons: [
        {
          lesson_id: {
            type: String,
            required: true,
          },
          title: {
            type: String,
            required: [true, "Lesson title is required"],
            trim: true,
            minlength: [3, "Lesson title must be at least 3 characters"],
            maxlength: [200, "Lesson title must be less than 200 characters"],
          },
          video_url: {
            type: String,
            required: [true, "Video URL is required"],
          },
          duration_seconds: {
            type: Number,
            required: [true, "Duration is required"],
            min: [1, "Duration must be at least 1 second"],
          },
          is_preview: {
            type: Boolean,
            default: false,
          },
          sort_order: {
            type: Number,
            required: true,
            min: 1,
          },
          resources: [
            {
              title: {
                type: String,
                required: true,
                trim: true,
              },
              file_url: {
                type: String,
                required: true,
              },
              file_type: {
                type: String,
                enum: ["pdf", "doc", "docx", "ppt", "pptx", "zip", "other"],
                required: true,
              },
            },
          ],
        },
      ],
    },
  ],
  stats: {
    total_students: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_sections: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_lessons: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_revenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    average_rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    total_reviews: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Update updated_at on save
courseSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model("Course", courseSchema);
