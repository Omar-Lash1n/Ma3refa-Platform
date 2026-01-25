// ============================================
// app.js - Main Application File (updated)
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
// Preserve raw body buffer for webhook signature verification (Stripe)
app.use(express.urlencoded({ extended: true }));
app.use(express.json({
  verify: (req, res, buf) => {
    // Save raw buffer for webhook signature verification (used by stripe webhook handler)
    req.rawBody = buf;
  }
}));
app.use(cors());

// ============================================
// IMPORT ROUTES (keep after express.json so req.rawBody is set)
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
const paymentWebhookRoutes = require('./routes/paymentWebhookRoute');

// ============================================
// DATABASE CONNECTION (robust with retries)
// ============================================
const connectDB = async () => {
  const uri = process.env.DBurl;
  if (!uri) {
    console.error("DBurl is not set in environment (.env). Please set DBurl and restart.");
    throw new Error("Missing DBurl");
  }
  console.log("Attempting to connect to MongoDB at:", uri);

  const maxAttempts = parseInt(process.env.DB_CONNECT_RETRIES || "5", 10);
  const retryDelayMs = parseInt(process.env.DB_CONNECT_DELAY_MS || "5000", 10);
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      // Mongoose v6+ does not require useNewUrlParser/useUnifiedTopology options
      await mongoose.connect(uri);
      console.log("Database connected successfully");
      return;
    } catch (error) {
      attempts++;
      console.error(`Database connection attempt ${attempts} failed:`, error.message);
      if (attempts >= maxAttempts) {
        console.error("Database connection failed after maximum retries.");
        // Throw error so caller (nodemon) sees it and you can fix env/connection.
        throw error;
      }
      console.log(`Retrying to connect in ${retryDelayMs}ms...`);
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }
};

connectDB().catch(err => {
  // If connection ultimately fails, log and rethrow to make process exit (nodemon will restart)
  console.error("connectDB failed:", err);
  // Re-throw so the process terminates and nodemon reports crash (useful in dev)
  throw err;
});

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

// Mount webhook / capture routes for payments
app.use('/api/payments/webhook', paymentWebhookRoutes);

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
  console.error('Error:', err && err.stack ? err.stack : err);
  res.status(err && err.status ? err.status : 500).json({
    message: err && err.message ? err.message : "Internal Server Error"
  });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;