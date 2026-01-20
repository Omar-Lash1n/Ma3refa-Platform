const Teacher = require('../models/teacherModel');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcryptjs');

// @desc    Register a new teacher
// @route   POST /api/teachers/register
// @access  Public
const registerTeacher = async (req, res) => {
  try {
    const { full_name, email, password, cv_path, subjects } = req.body;

    const teacherExists = await Teacher.findOne({ email });

    if (teacherExists) {
      return res.status(400).json({ message: 'Teacher already exists' });
    }

    // Note: cv_path should ideally come from a file upload middleware
    const teacher = await Teacher.create({
      full_name,
      email,
      password,
      cv_path,
      subjects,
      approval_status: 'Pending'
    });

    if (teacher) {
      res.status(201).json({
        _id: teacher._id,
        full_name: teacher.full_name,
        email: teacher.email,
        role: 'Teacher',
        approval_status: teacher.approval_status,
        token: generateToken(teacher._id, 'Teacher'),
      });
    } else {
      res.status(400).json({ message: 'Invalid teacher data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth teacher & get token
// @route   POST /api/teachers/login
// @access  Public
const loginTeacher = async (req, res) => {
  try {
    const { email, password } = req.body;

    const teacher = await Teacher.findOne({ email });

    if (teacher && (await bcrypt.compare(password, teacher.password))) {
      res.json({
        _id: teacher._id,
        full_name: teacher.full_name,
        email: teacher.email,
        role: 'Teacher',
        approval_status: teacher.approval_status,
        token: generateToken(teacher._id, 'Teacher'),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get teacher profile
// @route   GET /api/teachers/profile
// @access  Private (Teacher only)
const getTeacherProfile = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user._id).select('-password');
    if (teacher) {
      res.json(teacher);
    } else {
      res.status(404).json({ message: 'Teacher not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update teacher profile
// @route   PUT /api/teachers/profile
// @access  Private (Teacher only)
const updateTeacherProfile = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user._id);

    if (teacher) {
      teacher.full_name = req.body.full_name || teacher.full_name;
      teacher.email = req.body.email || teacher.email;
      if (req.body.password) {
        teacher.password = req.body.password;
      }
      teacher.bio = req.body.bio || teacher.bio;
      teacher.image_url = req.body.image_url || teacher.image_url;
      teacher.subjects = req.body.subjects || teacher.subjects;
      // Note: updating CV or certificates might require re-approval logic depending on business rules

      const updatedTeacher = await teacher.save();

      res.json({
        _id: updatedTeacher._id,
        full_name: updatedTeacher.full_name,
        email: updatedTeacher.email,
        role: 'Teacher',
        approval_status: updatedTeacher.approval_status,
        token: generateToken(updatedTeacher._id, 'Teacher'),
      });
    } else {
      res.status(404).json({ message: 'Teacher not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerTeacher,
  loginTeacher,
  getTeacherProfile,
  updateTeacherProfile,
};
