const express = require('express');
const router = express.Router();
const {
  registerTeacher,
  loginTeacher,
  getTeacherProfile,
  updateTeacherProfile,
} = require('../controllers/teacherController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.post('/register', registerTeacher);
router.post('/login', loginTeacher);
router
  .route('/profile')
  .get(protect, authorize('Teacher'), getTeacherProfile)
  .put(protect, authorize('Teacher'), updateTeacherProfile);

module.exports = router;
