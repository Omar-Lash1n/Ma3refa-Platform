
// ============================================
// CONTROLLER - studentController.js
// ============================================
const dotenv = require('dotenv');
dotenv.config();
const StudentModel = require("../models/studentModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// =====================Edited=======================
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%?&])/;
// ============================================

// Register Student
const registerStudent = async (req, res) => {
  try {
    const newStudent = req.body;

    if (!newStudent.email || !newStudent.password || !newStudent.full_name || !newStudent.age_category) {
      return res.status(400).json({ 
        message: "Email, password, full name, and age category are required" 
      });
    }

    const existingStudent = await StudentModel.findOne({ email: newStudent.email });
    if (existingStudent) {
      return res.status(400).json({ message: "Email already in use" });
    }

// =====================Edited=======================
    if (!passwordRegex.test(newStudent.password)) {
      return res.status(400).json({
      message: "Password must include uppercase, lowercase, number, and special character"
      });
    }
// ============================================

    const student = await StudentModel.create(newStudent);

    res.status(201).json({ 
      message: "Student registered successfully", 
      student: {
        id: student._id,
        email: student.email,
        full_name: student.full_name
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error registering student", error: error.message });
  }
};

// Login Student
const loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const student = await StudentModel.findOne({ email });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (!student.is_active) {
      return res.status(403).json({ message: "Your account has been deactivated" });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { 
        id: student._id, 
        name: student.full_name,
        userType: "Student"
      },
      process.env.secretKey,
      { expiresIn: "24h" }
    );

    res.status(200).json({ 
      message: "Login successful", 
      student: {
        id: student._id,
        email: student.email,
        full_name: student.full_name,
        age_category: student.age_category
      },
      token 
    });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
};

// Update Student Profile
const updateStudent = async (req, res) => {
  try {
    const studentId = req.user.id;
    const allowedFields = ["full_name", "age_category", "image_url", "parent_phone", "goal", "password"];

    const updates = {};
    Object.keys(req.body).forEach((field) => {
      if (allowedFields.includes(field)) {
        updates[field] = req.body[field];
      }
    });

    if (updates.password) {
      const student = await StudentModel.findById(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

// =====================Edited=======================
      if (updates.password && !passwordRegex.test(updates.password)) {
        return res.status(400).json({
        message: "Password must include uppercase, lowercase, number, and special character"
        });
      }
// ============================================

      Object.assign(student, updates);
      
      await student.save();

      return res.status(200).json({
        message: "Student profile updated successfully",
        student: {
          id: student._id,
          email: student.email,
          full_name: student.full_name
        }
      });
    }

    const updatedStudent = await StudentModel.findByIdAndUpdate(
      studentId,
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json({
      message: "Student profile updated successfully",
      student: {
        id: updatedStudent._id,
        email: updatedStudent.email,
        full_name: updatedStudent.full_name
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Student Profile
const getStudentProfile = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    const student = await StudentModel.findById(studentId).select("-password");
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json({ student });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Student Progress
const getStudentProgress = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    const student = await StudentModel.findById(studentId).select("progress stats");
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json({ 
      progress: student.progress,
      stats: student.stats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Lesson Progress
const updateLessonProgress = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { lesson_id, section_id, course_id, last_watched_time_sec, is_completed, total_duration_sec } = req.body;

    const student = await StudentModel.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const progressIndex = student.progress.findIndex(
      p => p.lesson_id === lesson_id
    );

    const completion_percentage = Math.round((last_watched_time_sec / total_duration_sec) * 100);

    if (progressIndex > -1) {
      student.progress[progressIndex].last_watched_time_sec = last_watched_time_sec;
      student.progress[progressIndex].completion_percentage = completion_percentage;
      student.progress[progressIndex].is_completed = is_completed;
      student.progress[progressIndex].watch_count += 1;
      student.progress[progressIndex].updated_at = Date.now();
    } else {
      student.progress.push({
        lesson_id,
        section_id,
        course_id,
        is_completed,
        completion_percentage,
        last_watched_time_sec,
        total_duration_sec,
        watch_count: 1,
        first_watched_at: Date.now(),
        updated_at: Date.now()
      });
    }

    await student.save();

    res.status(200).json({ 
      message: "Progress updated successfully",
      progress: student.progress[progressIndex > -1 ? progressIndex : student.progress.length - 1]
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Owned Sections
const getOwnedSections = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    const student = await StudentModel.findById(studentId).select("owned_sections");
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json({ owned_sections: student.owned_sections });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add to Wishlist
const addToWishlist = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { course_id } = req.body;

    const student = await StudentModel.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const alreadyInWishlist = student.wishlist.some(item => item.course_id === course_id);
    if (alreadyInWishlist) {
      return res.status(400).json({ message: "Course already in wishlist" });
    }

    student.wishlist.push({ course_id, added_at: Date.now() });
    await student.save();

    res.status(200).json({ 
      message: "Added to wishlist successfully",
      wishlist: student.wishlist
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remove from Wishlist
const removeFromWishlist = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { course_id } = req.params;

    const student = await StudentModel.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    student.wishlist = student.wishlist.filter(item => item.course_id !== course_id);
    await student.save();

    res.status(200).json({ 
      message: "Removed from wishlist successfully",
      wishlist: student.wishlist
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerStudent,
  loginStudent,
  updateStudent,
  getStudentProfile,
  getStudentProgress,
  updateLessonProgress,
  getOwnedSections,
  addToWishlist,
  removeFromWishlist
};
