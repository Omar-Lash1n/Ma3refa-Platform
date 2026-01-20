const express = require('express');
const router = express.Router();
const {
  registerAdmin,
  loginAdmin,
  getAdminProfile,
  approveTeacher
} = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.post('/register', registerAdmin);
router.post('/login', loginAdmin);
router.get('/profile', protect, authorize('Admin', 'SuperAdmin'), getAdminProfile);
router.put('/teachers/:id/approve', protect, authorize('Admin', 'SuperAdmin'), approveTeacher);

module.exports = router;
