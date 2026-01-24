
// ============================================
// ROUTES - notificationRoutes.js
// ============================================
const express = require("express");
const router = express.Router();
const NotificationModel = require("../models/notificationModel");
const { auth } = require("../controller/auth");

// Get My Notifications
router.get("/my-notifications", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;

    const notifications = await NotificationModel.find({
      recipient_id: userId,
      recipient_type: userType
    }).sort({ created_at: -1 });

    res.status(200).json({
      count: notifications.length,
      notifications
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Unread Notifications Count
router.get("/unread-count", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;

    const count = await NotificationModel.countDocuments({
      recipient_id: userId,
      recipient_type: userType,
      is_read: false
    });

    res.status(200).json({ unread_count: count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark Notification as Read
router.put("/mark-read/:notification_id", auth, async (req, res) => {
  try {
    const notification = await NotificationModel.findByIdAndUpdate(
      req.params.notification_id,
      { is_read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({
      message: "Notification marked as read",
      notification
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark All as Read
router.put("/mark-all-read", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;

    await NotificationModel.updateMany(
      {
        recipient_id: userId,
        recipient_type: userType,
        is_read: false
      },
      { is_read: true }
    );

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete Notification
router.delete("/delete/:notification_id", auth, async (req, res) => {
  try {
    const notification = await NotificationModel.findByIdAndDelete(req.params.notification_id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;