
// ============================================
// CONTROLLER - courseController.js
// ============================================
const CourseModel = require("../models/courseModel");

// Create Course (Approved Teachers Only)
const createCourse = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const courseData = req.body;

    if (!courseData.title || !courseData.description || !courseData.subject_id || !courseData.level) {
      return res.status(400).json({ 
        message: "Title, description, subject, and level are required" 
      });
    }

    courseData.teacher_id = teacherId;
    courseData.is_published = false;

    const course = await CourseModel.create(courseData);

    res.status(201).json({ 
      message: "Course created successfully", 
      course 
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating course", error: error.message });
  }
};

// Update Course (Teacher Only - Own Courses)
const updateCourse = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { course_id } = req.params;

    const course = await CourseModel.findById(course_id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.teacher_id !== teacherId) {
      return res.status(403).json({ message: "You can only update your own courses" });
    }

    const allowedFields = ["title", "description", "cover_image_url", "level", "is_published", "sections"];

    const updates = {};
    Object.keys(req.body).forEach((field) => {
      if (allowedFields.includes(field)) {
        updates[field] = req.body[field];
      }
    });

    const updatedCourse = await CourseModel.findByIdAndUpdate(
      course_id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: "Course updated successfully",
      course: updatedCourse
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Courses (Public)
const getAllCourses = async (req, res) => {
  try {
    const { subject_id, level, teacher_id, is_published } = req.query;

    const filter = {};
    if (subject_id) filter.subject_id = subject_id;
    if (level) filter.level = level;
    if (teacher_id) filter.teacher_id = teacher_id;
    if (is_published !== undefined) filter.is_published = is_published === 'true';

    const courses = await CourseModel.find(filter);

    res.status(200).json({
      count: courses.length,
      courses
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Single Course (Public)
const getCourseById = async (req, res) => {
  try {
    const { course_id } = req.params;

    const course = await CourseModel.findById(course_id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.status(200).json({ course });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Teacher's Courses
const getTeacherCourses = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const courses = await CourseModel.find({ teacher_id: teacherId });

    res.status(200).json({
      count: courses.length,
      courses
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Course (Teacher Only - Own Courses)
const deleteCourse = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { course_id } = req.params;

    const course = await CourseModel.findById(course_id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.teacher_id !== teacherId) {
      return res.status(403).json({ message: "You can only delete your own courses" });
    }

    await CourseModel.findByIdAndDelete(course_id);

    res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createCourse,
  updateCourse,
  getAllCourses,
  getCourseById,
  getTeacherCourses,
  deleteCourse
};
