// ============================================
// ROUTES - paymentRoutes.js
// ============================================
const express = require("express");
const router = express.Router();
const {
  createPayment,
  getStudentPayments,
  getAllPayments
} = require("../controller/paymentController");
const { authStudent, authAdmin } = require("../controller/auth");

// Student Routes
router.post("/create", authStudent, createPayment);
router.get("/my-payments", authStudent, getStudentPayments);

// Admin Routes
router.get("/all", authAdmin, getAllPayments);

module.exports = router;