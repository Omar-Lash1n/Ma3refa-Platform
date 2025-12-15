
// ============================================
// CONTROLLER - paymentController.js
// ============================================
const PaymentModel = require("../models/paymentModel");
const StudentModel = require("../models/studentModel");
const TeacherEarningsModel = require("../models/TeacherEarningsModel"); 

// Create Payment (Purchase Sections)
const createPayment = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { purchased_sections, payment_method, gateway_ref } = req.body;

    if (!purchased_sections || purchased_sections.length === 0) {
      return res.status(400).json({ message: "Purchased sections are required" });
    }

    // Calculate total amount
    let totalAmount = 0;
    purchased_sections.forEach(section => {
      totalAmount += section.section_price;
    });

    // Get commission rate from settings (default 0.1 = 10%)
    const commissionRate = 0.1;
    const platformCommission = totalAmount * commissionRate;
    const netToTeacher = totalAmount - platformCommission;

    // Get teacher_id from first section (assuming all sections from same teacher)
    const teacherId = purchased_sections[0].teacher_id || "UNKNOWN";

    const payment = await PaymentModel.create({
      student_id: studentId,
      teacher_id: teacherId,
      amount: totalAmount,
      status: "Successful",
      payment_method,
      gateway_ref,
      commission_rate: commissionRate,
      platform_commission: platformCommission,
      net_to_teacher: netToTeacher,
      purchased_sections
    });

    // Update student's owned_sections
    const student = await StudentModel.findById(studentId);
    purchased_sections.forEach(section => {
      student.owned_sections.push({
        section_id: section.section_id,
        course_id: section.course_id,
        teacher_id: teacherId,
        purchase_date: Date.now(),
        payment_id: payment._id,
        price_paid: section.section_price
      });
    });

    // Update student stats
    student.stats.total_sections_owned += purchased_sections.length;
    student.stats.total_spent += totalAmount;

    // Add to payment history
    student.payment_history.push({
      payment_id: payment._id,
      amount: totalAmount,
      payment_date: Date.now(),
      status: "Successful"
    });

    await student.save();

    // Update teacher earnings
    let teacherEarnings = await TeacherEarningsModel.findOne({ teacher_id: teacherId });
    if (!teacherEarnings) {
      teacherEarnings = await TeacherEarningsModel.create({
        teacher_id: teacherId,
        total_earned: netToTeacher,
        available_balance: netToTeacher,
        pending_balance: 0
      });
    } else {
      teacherEarnings.total_earned += netToTeacher;
      teacherEarnings.pending_balance += netToTeacher;
      await teacherEarnings.save();
    }

    res.status(201).json({
      message: "Payment successful",
      payment,
      owned_sections: student.owned_sections
    });
  } catch (error) {
    res.status(500).json({ message: "Error processing payment", error: error.message });
  }
};

// Get Payment History (Student)
const getStudentPayments = async (req, res) => {
  try {
    const studentId = req.user.id;

    const payments = await PaymentModel.find({ student_id: studentId }).sort({ payment_date: -1 });

    res.status(200).json({
      count: payments.length,
      payments
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Payments (Admin)
const getAllPayments = async (req, res) => {
  try {
    const { status, teacher_id, student_id } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (teacher_id) filter.teacher_id = teacher_id;
    if (student_id) filter.student_id = student_id;

    const payments = await PaymentModel.find(filter).sort({ payment_date: -1 });

    res.status(200).json({
      count: payments.length,
      payments
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createPayment,
  getStudentPayments,
  getAllPayments
};