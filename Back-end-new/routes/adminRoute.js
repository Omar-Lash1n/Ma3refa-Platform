
// ============================================
// ROUTES - adminRoutes.js
// ============================================
const express = require("express");
const router = express.Router();
const {
  registerAdmin,
  loginAdmin,
  getAllAdmins,
  updateAdmin,
  deleteAdmin
} = require("../controller/adminController");
const { authAdmin } = require("../controller/auth");

// Public Routes
router.post("/login", loginAdmin);

// Protected Routes (Admin Only - SuperAdmin for some)
router.post("/register", authAdmin, registerAdmin); // SuperAdmin only
router.get("/all", authAdmin, getAllAdmins); // SuperAdmin only
router.put("/update/:admin_id", authAdmin, updateAdmin); // SuperAdmin only
router.delete("/delete/:admin_id", authAdmin, deleteAdmin); // SuperAdmin only

module.exports = router;