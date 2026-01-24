// ============================================
// ROUTES - teacherRoutes.js
// ============================================
const express = require("express");
const router = express.Router();
const {
  registerTeacher,
  loginTeacher,
  updateTeacher,
  getTeacherProfile,
  getApprovalStatus,
  getAllTeachers,
  approveTeacher,
  rejectTeacher
} = require("../controller/teacherController");
const { authTeacher, authAdmin } = require("../controller/auth");

// Public Routes
router.post("/register", registerTeacher);
router.post("/login", loginTeacher);

// Protected Routes (Teacher Only)
router.get("/profile", authTeacher, getTeacherProfile);
router.put("/update-profile", authTeacher, updateTeacher);
router.get("/approval-status", authTeacher, getApprovalStatus);

// Admin Routes
router.get("/all", authAdmin, getAllTeachers);
router.put("/approve/:teacher_id", authAdmin, approveTeacher);
router.put("/reject/:teacher_id", authAdmin, rejectTeacher);

module.exports = router;
