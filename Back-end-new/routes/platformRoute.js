
// ============================================
// ROUTES - platformSettingsRoutes.js
// ============================================
const express = require("express");
const router = express.Router();
const PlatformSettingsModel = require("../models/platformModel");
const { authAdmin } = require("../controller/auth");

// Get Platform Settings (Admin Only)
router.get("/", authAdmin, async (req, res) => {
  try {
    const settings = await PlatformSettingsModel.findOne();
    if (!settings) {
      return res.status(404).json({ message: "Settings not found" });
    }

    res.status(200).json({ settings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update Platform Settings (Admin Only)
router.put("/update", authAdmin, async (req, res) => {
  try {
    const { commission_rate, min_withdrawal, payment_gateways, currency } = req.body;
    const adminId = req.user.id;

    let settings = await PlatformSettingsModel.findOne();

    if (!settings) {
      settings = await PlatformSettingsModel.create({
        commission_rate: commission_rate || 0.1,
        min_withdrawal: min_withdrawal || 100,
        payment_gateways: payment_gateways || ["stripe"],
        currency: currency || "EGP",
        updated_by: adminId
      });
    } else {
      if (commission_rate !== undefined) settings.commission_rate = commission_rate;
      if (min_withdrawal !== undefined) settings.min_withdrawal = min_withdrawal;
      if (payment_gateways !== undefined) settings.payment_gateways = payment_gateways;
      if (currency !== undefined) settings.currency = currency;
      settings.updated_by = adminId;

      await settings.save();
    }

    res.status(200).json({
      message: "Settings updated successfully",
      settings
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
