// ============================================
// ROUTES - studentRoutes.js
// ============================================
const express = require("express");
const router = express.Router();
const {
  registerStudent,
  loginStudent,
  updateStudent,
  getStudentProfile,
  getStudentProgress,
  updateLessonProgress,
  getOwnedSections,
  addToWishlist,
  removeFromWishlist
} = require("../controller/studentController");
const { authStudent } = require("../controller/auth");

// Public Routes
router.post("/register", registerStudent);
router.post("/login", loginStudent);

// Protected Routes (Student Only)
router.get("/profile", authStudent, getStudentProfile);
router.put("/update-profile", authStudent, updateStudent);
router.get("/progress", authStudent, getStudentProgress);
router.post("/progress/update", authStudent, updateLessonProgress);
router.get("/owned-sections", authStudent, getOwnedSections);
router.post("/wishlist/add", authStudent, addToWishlist);
router.delete("/wishlist/remove/:course_id", authStudent, removeFromWishlist);

module.exports = router;
