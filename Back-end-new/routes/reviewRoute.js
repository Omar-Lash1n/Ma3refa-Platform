
// ============================================
// ROUTES - reviewRoutes.js
// ============================================
const express = require("express");
const router = express.Router();
const ReviewModel = require("../models/reviewModel");
const { authStudent, authAdmin } = require("../controller/auth");

// Create Review (Student Only)
router.post("/create", authStudent, async (req, res) => {
  try {
    const studentId = req.user.id;
    const { course_id, teacher_id, rating, comment } = req.body;

    if (!course_id || !teacher_id || !rating) {
      return res.status(400).json({ message: "Course ID, Teacher ID, and Rating are required" });
    }

    // Check if student already reviewed this course
    const existingReview = await ReviewModel.findOne({
      course_id,
      student_id: studentId
    });

    if (existingReview) {
      return res.status(400).json({ message: "You have already reviewed this course" });
    }

    const review = await ReviewModel.create({
      course_id,
      student_id: studentId,
      teacher_id,
      rating,
      comment
    });

    res.status(201).json({
      message: "Review submitted successfully. Waiting for approval.",
      review
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Course Reviews (Public - Approved Only)
router.get("/course/:course_id", async (req, res) => {
  try {
    const reviews = await ReviewModel.find({
      course_id: req.params.course_id,
      is_approved: true
    }).sort({ created_at: -1 });

    res.status(200).json({
      count: reviews.length,
      reviews
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get All Reviews (Admin Only)
router.get("/all", authAdmin, async (req, res) => {
  try {
    const { is_approved } = req.query;

    const filter = {};
    if (is_approved !== undefined) {
      filter.is_approved = is_approved === 'true';
    }

    const reviews = await ReviewModel.find(filter).sort({ created_at: -1 });

    res.status(200).json({
      count: reviews.length,
      reviews
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve Review (Admin Only)
router.put("/approve/:review_id", authAdmin, async (req, res) => {
  try {
    const review = await ReviewModel.findByIdAndUpdate(
      req.params.review_id,
      { is_approved: true },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.status(200).json({
      message: "Review approved successfully",
      review
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete Review (Admin Only)
router.delete("/delete/:review_id", authAdmin, async (req, res) => {
  try {
    const review = await ReviewModel.findByIdAndDelete(req.params.review_id);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
