const Student = require('../models/studentModel');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcryptjs');

// @desc    Register a new student
// @route   POST /api/students/register
// @access  Public
const registerStudent = async (req, res) => {
  try {
    const { full_name, email, password, age_category, parent_phone } = req.body;

    const studentExists = await Student.findOne({ email });

    if (studentExists) {
      return res.status(400).json({ message: 'Student already exists' });
    }

    const student = await Student.create({
      full_name,
      email,
      password,
      age_category,
      parent_phone
    });

    if (student) {
      res.status(201).json({
        _id: student._id,
        full_name: student.full_name,
        email: student.email,
        role: 'Student',
        token: generateToken(student._id, 'Student'),
      });
    } else {
      res.status(400).json({ message: 'Invalid student data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth student & get token
// @route   POST /api/students/login
// @access  Public
const loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;

    const student = await Student.findOne({ email });

    if (student && (await bcrypt.compare(password, student.password))) {
      res.json({
        _id: student._id,
        full_name: student.full_name,
        email: student.email,
        role: 'Student',
        token: generateToken(student._id, 'Student'),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get student profile
// @route   GET /api/students/profile
// @access  Private (Student only)
const getStudentProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.user._id).select('-password');
    if (student) {
      res.json(student);
    } else {
      res.status(404).json({ message: 'Student not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update student profile
// @route   PUT /api/students/profile
// @access  Private (Student only)
const updateStudentProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.user._id);

    if (student) {
      student.full_name = req.body.full_name || student.full_name;
      student.email = req.body.email || student.email;
      if (req.body.password) {
        student.password = req.body.password;
      }
      student.age_category = req.body.age_category || student.age_category;
      student.parent_phone = req.body.parent_phone || student.parent_phone;
      student.image_url = req.body.image_url || student.image_url;

      const updatedStudent = await student.save();

      res.json({
        _id: updatedStudent._id,
        full_name: updatedStudent.full_name,
        email: updatedStudent.email,
        role: 'Student',
        token: generateToken(updatedStudent._id, 'Student'),
      });
    } else {
      res.status(404).json({ message: 'Student not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerStudent,
  loginStudent,
  getStudentProfile,
  updateStudentProfile,
};
