
// ============================================
// 1) Student Schema
// ============================================
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const studentSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email"],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"],
    // match: [
    //   /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%?&])[A-Za-z\d@$!%?&]{6,}$/,
    //   "Password must include uppercase, lowercase, number, and special character",
    // ],
  },
  full_name: {
    type: String,
    required: [true, "Full name is required"],
    trim: true,
    minlength: [3, "Name must be at least 3 characters"],
    maxlength: [100, "Name must be less than 100 characters"],
  },
  age_category: {
    type: String,
    enum: ["Kid", "Teen", "Adult"],
    required: [true, "Age category is required"],
  },
  image_url: {
    type: String,
    default: null,
  },
  parent_phone: {
    type: String,
    match: [/^(\+\d{1,3})?\d{10,15}$/, "Invalid phone number format"],
    default: null,
  },

  is_active: {
    type: Boolean,
    default: true,
  },
  owned_sections: [
    {
      section_id: {
        type: String,
        required: true,
      },
      course_id: {
        type: String,
        required: true,
      },
      teacher_id: {
        type: String,
        required: true,
      },
      purchase_date: {
        type: Date,
        default: Date.now,
      },
      payment_id: {
        type: String,
        required: true,
      },
      price_paid: {
        type: Number,
        required: true,
        min: 0,
      },
    },
  ],
  progress: [
    {
      lesson_id: {
        type: String,
        required: true,
      },
      section_id: {
        type: String,
        required: true,
      },
      course_id: {
        type: String,
        required: true,
      },
      is_completed: {
        type: Boolean,
        default: false,
      },
      completion_percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      last_watched_time_sec: {
        type: Number,
        default: 0,
        min: 0,
      },
      total_duration_sec: {
        type: Number,
        required: true,
        min: 0,
      },
      watch_count: {
        type: Number,
        default: 0,
        min: 0,
      },
      first_watched_at: {
        type: Date,
        default: Date.now,
      },
      updated_at: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  stats: {
    total_courses_enrolled: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_sections_owned: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_lessons_completed: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_watch_time_minutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_spent: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  wishlist: [
    {
      course_id: {
        type: String,
        required: true,
      },
      added_at: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  payment_history: [
    {
      payment_id: {
        type: String,
        required: true,
      },
      amount: {
        type: Number,
        required: true,
        min: 0,
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
    },
  ],
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
studentSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Update updated_at on save
studentSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model("Student", studentSchema);
