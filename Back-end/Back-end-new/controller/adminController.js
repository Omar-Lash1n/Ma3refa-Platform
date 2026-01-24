
// ============================================
// CONTROLLER - adminController.js
// ============================================
const AdminModel = require("../models/adminModel");

// ====================Edited========================
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
// ============================================

// Register Admin (SuperAdmin Only)
const registerAdmin = async (req, res) => {
  try {
    // Only SuperAdmin can create new admins
    if (req.user.role !== "SuperAdmin") {
      return res.status(403).json({ message: "Only SuperAdmin can create admins" });
    }

    const newAdmin = req.body;

    if (!newAdmin.email || !newAdmin.password || !newAdmin.full_name) {
      return res.status(400).json({ 
        message: "Email, password, and full name are required" 
      });
    }

    const existingAdmin = await AdminModel.findOne({ email: newAdmin.email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const admin = await AdminModel.create(newAdmin);

    res.status(201).json({ 
      message: "Admin registered successfully", 
      admin: {
        id: admin._id,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error registering admin", error: error.message });
  }
};

// Login Admin
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const admin = await AdminModel.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    if (!admin.is_active) {
      return res.status(403).json({ message: "Your account has been deactivated" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { 
        id: admin._id, 
        name: admin.full_name,
        role: admin.role,
        userType: "Admin"
      },
      process.env.secretKey,
      { expiresIn: "24h" }
    );

    res.status(200).json({ 
      message: "Login successful", 
      admin: {
        id: admin._id,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role
      },
      token 
    });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
};

// Get All Admins (SuperAdmin Only)
const getAllAdmins = async (req, res) => {
  try {
    if (req.user.role !== "SuperAdmin") {
      return res.status(403).json({ message: "Only SuperAdmin can view admins" });
    }

    const admins = await AdminModel.find().select("-password");
    
    res.status(200).json({ 
      count: admins.length,
      admins 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Admin (SuperAdmin Only)
const updateAdmin = async (req, res) => {
  try {
    if (req.user.role !== "SuperAdmin") {
      return res.status(403).json({ message: "Only SuperAdmin can update admins" });
    }

    const { admin_id } = req.params;
    const allowedFields = ["full_name", "role", "permissions", "is_active", "password"];

    const updates = {};
    Object.keys(req.body).forEach((field) => {
      if (allowedFields.includes(field)) {
        updates[field] = req.body[field];
      }
    });

    if (updates.password) {
      const admin = await AdminModel.findById(admin_id);
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      Object.assign(admin, updates);
      await admin.save();

      return res.status(200).json({
        message: "Admin updated successfully",
        admin: {
          id: admin._id,
          email: admin.email,
          full_name: admin.full_name
        }
      });
    }

    const updatedAdmin = await AdminModel.findByIdAndUpdate(
      admin_id,
      updates,
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json({
      message: "Admin updated successfully",
      admin: updatedAdmin
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Admin (SuperAdmin Only)
const deleteAdmin = async (req, res) => {
  try {
    if (req.user.role !== "SuperAdmin") {
      return res.status(403).json({ message: "Only SuperAdmin can delete admins" });
    }

    const { admin_id } = req.params;

    const admin = await AdminModel.findByIdAndDelete(admin_id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json({ message: "Admin deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerAdmin,
  loginAdmin,
  getAllAdmins,
  updateAdmin,
  deleteAdmin
};
