
// ============================================
// ROUTES - courseRoutes.js
// ============================================
const express = require("express");
const router = express.Router();
const {
  createCourse,
  updateCourse,
  getAllCourses,
  getCourseById,
  getTeacherCourses,
  deleteCourse
} = require("../controller/courseController");
const { authApprovedTeacher, auth } = require("../controller/auth");

// Public Routes
router.get("/all", getAllCourses);
router.get("/:course_id", getCourseById);

// Protected Routes (Approved Teacher Only)
router.post("/create", authApprovedTeacher, createCourse);
router.put("/update/:course_id", authApprovedTeacher, updateCourse);
router.delete("/delete/:course_id", authApprovedTeacher, deleteCourse);
router.get("/teacher/my-courses", authApprovedTeacher, getTeacherCourses);

module.exports = router;