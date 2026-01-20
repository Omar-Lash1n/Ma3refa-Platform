const Admin = require('../models/adminModel');
const Teacher = require('../models/teacherModel');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcryptjs');

// @desc    Register a new admin
// @route   POST /api/admins/register
// @access  Public (Should be protected or seeded in production)
const registerAdmin = async (req, res) => {
  try {
    const { full_name, email, password, role } = req.body;

    const adminExists = await Admin.findOne({ email });

    if (adminExists) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const admin = await Admin.create({
      full_name,
      email,
      password,
      role: role || 'Admin'
    });

    if (admin) {
      res.status(201).json({
        _id: admin._id,
        full_name: admin.full_name,
        email: admin.email,
        role: admin.role,
        token: generateToken(admin._id, admin.role),
      });
    } else {
      res.status(400).json({ message: 'Invalid admin data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth admin & get token
// @route   POST /api/admins/login
// @access  Public
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });

    if (admin && (await bcrypt.compare(password, admin.password))) {
      res.json({
        _id: admin._id,
        full_name: admin.full_name,
        email: admin.email,
        role: admin.role,
        token: generateToken(admin._id, admin.role),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get admin profile
// @route   GET /api/admins/profile
// @access  Private (Admin only)
const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user._id).select('-password');
    if (admin) {
      res.json(admin);
    } else {
      res.status(404).json({ message: 'Admin not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve or Reject a teacher
// @route   PUT /api/admins/teachers/:id/approve
// @access  Private (Admin only)
const approveTeacher = async (req, res) => {
    try {
        const { action, reason } = req.body; // action: 'Approved' or 'Rejected'
        const teacherId = req.params.id;

        if (!['Approved', 'Rejected'].includes(action)) {
            return res.status(400).json({ message: 'Invalid action. Must be Approved or Rejected' });
        }

        const teacher = await Teacher.findById(teacherId);

        if (!teacher) {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        teacher.approval_status = action;
        if (action === 'Rejected') {
            teacher.rejection_reason = reason;
        }

        teacher.approval_history.push({
            action,
            admin_id: req.user._id,
            reason,
            timestamp: Date.now()
        });

        await teacher.save();

        res.json({ message: `Teacher ${action}`, teacher });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = {
  registerAdmin,
  loginAdmin,
  getAdminProfile,
  approveTeacher
};
