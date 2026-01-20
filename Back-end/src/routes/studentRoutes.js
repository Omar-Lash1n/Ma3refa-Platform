const express = require('express');
const router = express.Router();
const {
  registerStudent,
  loginStudent,
  getStudentProfile,
  updateStudentProfile,
} = require('../controllers/studentController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.post('/register', registerStudent);
router.post('/login', loginStudent);
router
  .route('/profile')
  .get(protect, authorize('Student'), getStudentProfile)
  .put(protect, authorize('Student'), updateStudentProfile);

module.exports = router;
