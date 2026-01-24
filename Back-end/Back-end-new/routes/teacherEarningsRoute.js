// ============================================
// ROUTES - teacherEarningsRoutes.js
// ============================================
const express = require("express");
const router = express.Router();
const {
  getTeacherEarnings,
  requestWithdrawal,
  getWithdrawalHistory,
  approveWithdrawal,
  rejectWithdrawal
} = require("../controller/teacherEarningsController");
const { authTeacher, authAdmin } = require("../controller/auth");

// Teacher Routes
router.get("/my-earnings", authTeacher, getTeacherEarnings);
router.post("/withdrawal/request", authTeacher, requestWithdrawal);
router.get("/withdrawal/history", authTeacher, getWithdrawalHistory);

// Admin Routes
router.put("/withdrawal/approve/:teacher_id/:withdrawal_id", authAdmin, approveWithdrawal);
router.put("/withdrawal/reject/:teacher_id/:withdrawal_id", authAdmin, rejectWithdrawal);

module.exports = router;