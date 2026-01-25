
// ============================================
// CONTROLLER - teacherEarningsController.js
// ============================================
const TeacherEarningsModel = require("../models/TeacherEarningsModel");

// Get Teacher Earnings
const getTeacherEarnings = async (req, res) => {
  try {
    const teacherId = req.user.id;

    let earnings = await TeacherEarningsModel.findOne({ teacher_id: teacherId });
    
    if (!earnings) {
      earnings = await TeacherEarningsModel.create({
        teacher_id: teacherId,
        total_earned: 0,
        total_withdrawn: 0,
        available_balance: 0,
        pending_balance: 0
      });
    }

    res.status(200).json({ earnings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Request Withdrawal
const requestWithdrawal = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { amount, method, bank_details } = req.body;

    if (!amount || !method) {
      return res.status(400).json({ message: "Amount and withdrawal method are required" });
    }

    const earnings = await TeacherEarningsModel.findOne({ teacher_id: teacherId });
    if (!earnings) {
      return res.status(404).json({ message: "Earnings record not found" });
    }

    if (amount > earnings.available_balance) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    const withdrawalId = `WD${Date.now()}`;

    earnings.withdrawal_history.push({
      withdrawal_id: withdrawalId,
      amount,
      request_date: Date.now(),
      status: "Pending",
      method,
      bank_details: bank_details || {}
    });

    earnings.available_balance -= amount;
    earnings.pending_balance += amount;

    await earnings.save();

    res.status(201).json({
      message: "Withdrawal request submitted successfully",
      withdrawal: earnings.withdrawal_history[earnings.withdrawal_history.length - 1]
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Withdrawal History
const getWithdrawalHistory = async (req, res) => {
  try {
    const teacherId = req.user.id;

    const earnings = await TeacherEarningsModel.findOne({ teacher_id: teacherId });
    if (!earnings) {
      return res.status(404).json({ message: "Earnings record not found" });
    }

    res.status(200).json({
      withdrawal_history: earnings.withdrawal_history
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Approve Withdrawal (Admin)
const approveWithdrawal = async (req, res) => {
  try {
    const { teacher_id, withdrawal_id } = req.params;

    const earnings = await TeacherEarningsModel.findOne({ teacher_id });
    if (!earnings) {
      return res.status(404).json({ message: "Earnings record not found" });
    }

    const withdrawal = earnings.withdrawal_history.find(w => w.withdrawal_id === withdrawal_id);
    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal request not found" });
    }

    if (withdrawal.status !== "Pending") {
      return res.status(400).json({ message: "Withdrawal already processed" });
    }

    withdrawal.status = "Completed";
    withdrawal.transfer_date = Date.now();

    earnings.pending_balance -= withdrawal.amount;
    earnings.total_withdrawn += withdrawal.amount;

    await earnings.save();

    res.status(200).json({
      message: "Withdrawal approved successfully",
      withdrawal
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reject Withdrawal (Admin)
const rejectWithdrawal = async (req, res) => {
  try {
    const { teacher_id, withdrawal_id } = req.params;
    const { rejection_reason } = req.body;

    const earnings = await TeacherEarningsModel.findOne({ teacher_id });
    if (!earnings) {
      return res.status(404).json({ message: "Earnings record not found" });
    }

    const withdrawal = earnings.withdrawal_history.find(w => w.withdrawal_id === withdrawal_id);
    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal request not found" });
    }

    if (withdrawal.status !== "Pending") {
      return res.status(400).json({ message: "Withdrawal already processed" });
    }

    withdrawal.status = "Rejected";
    withdrawal.rejection_reason = rejection_reason;

    earnings.pending_balance -= withdrawal.amount;
    earnings.available_balance += withdrawal.amount;

    await earnings.save();

    res.status(200).json({
      message: "Withdrawal rejected successfully",
      withdrawal
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTeacherEarnings,
  requestWithdrawal,
  getWithdrawalHistory,
  approveWithdrawal,
  rejectWithdrawal
};