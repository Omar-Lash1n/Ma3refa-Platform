
// ============================================
// 2) Teacher Schema
// ============================================
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const teacherSchema = new mongoose.Schema({
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
    match: [
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%?&])[A-Za-z\d@$!%?&]{6,}$/,
      "Password must include uppercase, lowercase, number, and special character",
    ],
  },
  full_name: {
    type: String,
    required: [true, "Full name is required"],
    trim: true,
    minlength: [3, "Name must be at least 3 characters"],
    maxlength: [100, "Name must be less than 100 characters"],
  },
  bio: {
    type: String,
    maxlength: [1000, "Bio must be less than 1000 characters"],
    default: null,
  },
  image_url: {
    type: String,
    default: null,
  },
  cv_path: {
    type: String,
    required: [true, "CV is required"],
  },
  certificate_paths: [
    {
      type: String,
    },
  ],
  subjects: [
    {
      type: String,
      required: true,
    },
  ],
  approval_status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  rejection_reason: {
    type: String,
    default: null,
  },
  admin_notes: {
    type: String,
    default: null,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  approval_history: [
    {
      action: {
        type: String,
        enum: ["Approved", "Rejected"],
        required: true,
      },
      admin_id: {
        type: String,
        required: true,
      },
      reason: {
        type: String,
        default: null,
      },
      timestamp: {
        type: Date,
        default: Date.now,
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
teacherSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Update updated_at on save
teacherSchema.pre("save", function (next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model("Teacher", teacherSchema);
