
// ============================================
// app.js - Main Application File
// ============================================
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Initialize Express App
const app = express();

// ============================================
// MIDDLEWARE
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// ============================================
// DATABASE CONNECTION
// ============================================
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DBurl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(" Database connected successfully");
  } catch (error) {
    console.error(" Database connection error:", error);
    process.exit(1);
  }
};

connectDB();

// ============================================
// IMPORT ROUTES
// ============================================
const studentRoutes = require('./routes/studentRoute');
const teacherRoutes = require('./routes/teacherRoute');
const adminRoutes = require('./routes/adminRoute');
const courseRoutes = require('./routes/courseRoute');
const paymentRoutes = require('./routes/paymentRoute');
const teacherEarningsRoutes = require('./routes/teacherEarningsRoute');
const subjectRoutes = require('./routes/subjectRoute');
const notificationRoutes = require('./routes/notificationRoute');
const reviewRoutes = require('./routes/reviewRoute');
const platformSettingsRoutes = require('./routes/platformRoute');

// ============================================
// USE ROUTES
// ============================================
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/earnings', teacherEarningsRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/settings', platformSettingsRoutes);

// ============================================
// HOME ROUTE
// ============================================
app.get('/', (req, res) => {
  res.json({
    message: " Learning Platform API",
    version: "1.0.0",
    status: "Running",
    endpoints: {
      students: "/api/students",
      teachers: "/api/teachers",
      admins: "/api/admins",
      courses: "/api/courses",
      payments: "/api/payments",
      earnings: "/api/earnings",
      subjects: "/api/subjects",
      notifications: "/api/notifications",
      reviews: "/api/reviews",
      settings: "/api/settings"
    }
  });
});

// ============================================
// 404 HANDLER
// ============================================
app.use((req, res) => {
  res.status(404).json({ 
    message: "Route not found",
    path: req.originalUrl 
  });
});

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({ 
    message: "Something went wrong!", 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

module.exports = app;