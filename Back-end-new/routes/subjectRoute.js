
// ============================================
// ROUTES - subjectRoutes.js
// ============================================
const express = require("express");
const router = express.Router();
const SubjectModel = require("../models/subjectModel");
const { authAdmin } = require("../controller/auth");

// Get All Subjects (Public)
router.get("/all", async (req, res) => {
  try {
    const subjects = await SubjectModel.find({ is_active: true });
    res.status(200).json({
      count: subjects.length,
      subjects
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Subject By ID (Public)
router.get("/:subject_id", async (req, res) => {
  try {
    const subject = await SubjectModel.findById(req.params.subject_id);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }
    res.status(200).json({ subject });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create Subject (Admin Only)
router.post("/create", authAdmin, async (req, res) => {
  try {
    const { subject_name, description, icon_url } = req.body;

    if (!subject_name) {
      return res.status(400).json({ message: "Subject name is required" });
    }

    const existingSubject = await SubjectModel.findOne({ subject_name });
    if (existingSubject) {
      return res.status(400).json({ message: "Subject already exists" });
    }

    const subject = await SubjectModel.create({
      subject_name,
      description,
      icon_url
    });

    res.status(201).json({
      message: "Subject created successfully",
      subject
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update Subject (Admin Only)
router.put("/update/:subject_id", authAdmin, async (req, res) => {
  try {
    const { subject_name, description, icon_url, is_active } = req.body;

    const updatedSubject = await SubjectModel.findByIdAndUpdate(
      req.params.subject_id,
      { subject_name, description, icon_url, is_active },
      { new: true, runValidators: true }
    );

    if (!updatedSubject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    res.status(200).json({
      message: "Subject updated successfully",
      subject: updatedSubject
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete Subject (Admin Only)
router.delete("/delete/:subject_id", authAdmin, async (req, res) => {
  try {
    const subject = await SubjectModel.findByIdAndDelete(req.params.subject_id);
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    res.status(200).json({ message: "Subject deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
