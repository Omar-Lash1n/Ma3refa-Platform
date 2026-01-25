
// ============================================
// CONTROLLER - teacherController.js
// ============================================
const TeacherModel = require("../models/teacherModel");

// ====================Edited========================
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
// ============================================

// Register Teacher
const registerTeacher = async (req, res) => {
  try {
    const newTeacher = req.body;

    if (!newTeacher.email || !newTeacher.password || !newTeacher.full_name || !newTeacher.cv_path) {
      return res.status(400).json({ 
        message: "Email, password, full name, and CV are required" 
      });
    }

    const existingTeacher = await TeacherModel.findOne({ email: newTeacher.email });
    if (existingTeacher) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const teacher = await TeacherModel.create(newTeacher);

    res.status(201).json({ 
      message: "Teacher registered successfully. Waiting for admin approval.", 
      teacher: {
        id: teacher._id,
        email: teacher.email,
        full_name: teacher.full_name,
        approval_status: teacher.approval_status
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error registering teacher", error: error.message });
  }
};

// Login Teacher
const loginTeacher = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const teacher = await TeacherModel.findOne({ email });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    if (!teacher.is_active) {
      return res.status(403).json({ message: "Your account has been deactivated" });
    }

    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { 
        id: teacher._id, 
        name: teacher.full_name,
        userType: "Teacher",
        approvalStatus: teacher.approval_status
      },
      process.env.secretKey,
      { expiresIn: "24h" }
    );

    res.status(200).json({ 
      message: "Login successful", 
      teacher: {
        id: teacher._id,
        email: teacher.email,
        full_name: teacher.full_name,
        approval_status: teacher.approval_status
      },
      token 
    });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
};

// Update Teacher Profile
const updateTeacher = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const allowedFields = ["full_name", "bio", "image_url", "subjects", "certificate_paths", "password"];

    const updates = {};
    Object.keys(req.body).forEach((field) => {
      if (allowedFields.includes(field)) {
        updates[field] = req.body[field];
      }
    });

    if (updates.password) {
      const teacher = await TeacherModel.findById(teacherId);
      if (!teacher) {
        return res.status(404).json({ message: "Teacher not found" });
      }

      Object.assign(teacher, updates);
      await teacher.save();

      return res.status(200).json({
        message: "Teacher profile updated successfully",
        teacher: {
          id: teacher._id,
          email: teacher.email,
          full_name: teacher.full_name
        }
      });
    }

    const updatedTeacher = await TeacherModel.findByIdAndUpdate(
      teacherId,
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedTeacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.status(200).json({
      message: "Teacher profile updated successfully",
      teacher: {
        id: updatedTeacher._id,
        email: updatedTeacher.email,
        full_name: updatedTeacher.full_name
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Teacher Profile
const getTeacherProfile = async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    const teacher = await TeacherModel.findById(teacherId).select("-password");
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.status(200).json({ teacher });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Teacher Approval Status
const getApprovalStatus = async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    const teacher = await TeacherModel.findById(teacherId).select("approval_status rejection_reason admin_notes approval_history");
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    res.status(200).json({ 
      approval_status: teacher.approval_status,
      rejection_reason: teacher.rejection_reason,
      admin_notes: teacher.admin_notes,
      approval_history: teacher.approval_history
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Teachers (Admin Only)
const getAllTeachers = async (req, res) => {
  try {
    const { approval_status } = req.query;
    
    const filter = {};
    if (approval_status) {
      filter.approval_status = approval_status;
    }

    const teachers = await TeacherModel.find(filter).select("-password");
    
    res.status(200).json({ 
      count: teachers.length,
      teachers 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Approve Teacher (Admin Only)
const approveTeacher = async (req, res) => {
  try {
    const { teacher_id } = req.params;
    const { admin_notes } = req.body;
    const adminId = req.user.id;

    const teacher = await TeacherModel.findById(teacher_id);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    teacher.approval_status = "Approved";
    teacher.admin_notes = admin_notes || null;
    teacher.rejection_reason = null;
    teacher.approval_history.push({
      action: "Approved",
      admin_id: adminId,
      reason: admin_notes,
      timestamp: Date.now()
    });

    await teacher.save({ validateBeforeSave: false });

    res.status(200).json({ 
      message: "Teacher approved successfully",
      teacher: {
        id: teacher._id,
        full_name: teacher.full_name,
        approval_status: teacher.approval_status
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reject Teacher (Admin Only)
const rejectTeacher = async (req, res) => {
  try {
    const { teacher_id } = req.params;
    const { rejection_reason } = req.body;
    const adminId = req.user.id;

    if (!rejection_reason) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    const teacher = await TeacherModel.findById(teacher_id);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    teacher.approval_status = "Rejected";
    teacher.rejection_reason = rejection_reason;
    teacher.approval_history.push({
      action: "Rejected",
      admin_id: adminId,
      reason: rejection_reason,
      timestamp: Date.now()
    });

    await teacher.save({ validateBeforeSave: false });

    res.status(200).json({ 
      message: "Teacher rejected successfully",
      teacher: {
        id: teacher._id,
        full_name: teacher.full_name,
        approval_status: teacher.approval_status,
        rejection_reason: teacher.rejection_reason
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerTeacher,
  loginTeacher,
  updateTeacher,
  getTeacherProfile,
  getApprovalStatus,
  getAllTeachers,
  approveTeacher,
  rejectTeacher
};