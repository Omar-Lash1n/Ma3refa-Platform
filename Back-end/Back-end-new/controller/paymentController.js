// Updated paymentController supporting stripe, paypal, paymob, and fake dev flow.

const PaymentModel = require("../models/paymentModel");
const StudentModel = require("../models/studentModel");
const TeacherEarningsModel = require("../models/TeacherEarningsModel");
const PlatformSettingsModel = require("../models/platformModel");

const { createCheckoutSession } = require("../services/stripeService");
const { createOrder } = require("../services/paypalService");
const { createOrder: paymobCreateOrder, createPaymentKey: paymobCreatePaymentKey, buildIframeUrl: paymobBuildIframeUrl } = require("../services/paymobService");
const { createFakePaymentLink } = require("../services/fakeService");

async function finalizePayment(paymentId) {
  const payment = await PaymentModel.findById(paymentId);
  if (!payment) throw new Error("Payment not found");
  if (payment.status === "Successful") return payment;

  payment.status = "Successful";
  await payment.save();

  const student = await StudentModel.findById(payment.student_id);
  if (!student) throw new Error("Student not found");

  payment.purchased_sections.forEach((section) => {
    student.owned_sections.push({
      section_id: section.section_id,
      course_id: section.course_id,
      teacher_id: payment.teacher_id,
      purchase_date: Date.now(),
      payment_id: payment._id,
      price_paid: section.section_price,
    });
  });

  student.stats.total_sections_owned += payment.purchased_sections.length;
  student.stats.total_spent += payment.amount;
  student.payment_history.push({
    payment_id: payment._id,
    amount: payment.amount,
    payment_date: Date.now(),
    status: "Successful",
  });
  await student.save();

  let teacherEarnings = await TeacherEarningsModel.findOne({ teacher_id: payment.teacher_id });
  if (!teacherEarnings) {
    teacherEarnings = await TeacherEarningsModel.create({
      teacher_id: payment.teacher_id,
      total_earned: payment.net_to_teacher,
      available_balance: payment.net_to_teacher,
      pending_balance: 0,
    });
  } else {
    teacherEarnings.total_earned += payment.net_to_teacher;
    teacherEarnings.pending_balance += payment.net_to_teacher;
    await teacherEarnings.save();
  }

  return payment;
}

const createPayment = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { purchased_sections, payment_method, billing_data } = req.body;

    if (!purchased_sections || purchased_sections.length === 0) {
      return res.status(400).json({ message: "Purchased sections are required" });
    }

    let totalAmount = 0;
    purchased_sections.forEach((section) => {
      totalAmount += section.section_price;
    });

    const settings = (await PlatformSettingsModel.findOne()) || {};
    const commissionRate = settings.commission_rate !== undefined ? settings.commission_rate : 0.1;
    const platformCommission = totalAmount * commissionRate;
    const netToTeacher = totalAmount - platformCommission;
    const teacherId = purchased_sections[0].teacher_id || "UNKNOWN";

    const payment = await PaymentModel.create({
      student_id: studentId,
      teacher_id: teacherId,
      amount: totalAmount,
      status: "Pending",
      payment_method,
      commission_rate: commissionRate,
      platform_commission: platformCommission,
      net_to_teacher: netToTeacher,
      purchased_sections,
    });

    if (payment_method === "stripe") {
      const currency = (settings.currency || "USD").toLowerCase();
      const amountCents = Math.round(totalAmount * 100);
      const successUrl = `${process.env.FRONTEND_URL}/payment-success?paymentId=${payment._id}`;
      const cancelUrl = `${process.env.FRONTEND_URL}/payment-cancel?paymentId=${payment._id}`;

      const session = await createCheckoutSession({
        amountCents,
        currency,
        metadata: { paymentId: payment._id.toString(), studentId },
        successUrl,
        cancelUrl,
      });

      payment.gateway_ref = session.id;
      await payment.save();

      return res.status(201).json({ checkoutUrl: session.url, paymentId: payment._id });
    } else if (payment_method === "paypal") {
      const currency = (settings.currency || "USD").toUpperCase();
      const amountStr = totalAmount.toFixed(2);
      const returnUrl = `${process.env.BACKEND_URL}/api/payments/webhook/capture-paypal`;
      const cancelUrl = `${process.env.FRONTEND_URL}/payment-cancel?paymentId=${payment._id}`;

      const order = await createOrder({ amount: amountStr, currency, returnUrl, cancelUrl });
      const approveLink = order.links.find((l) => l.rel === "approve");
      payment.gateway_ref = order.id;
      await payment.save();

      return res.status(201).json({ approveUrl: approveLink && approveLink.href, paymentId: payment._id, orderId: order.id });
    } else if (payment_method === "paymob") {
      const currency = (settings.currency || "EGP");
      const amountCents = Math.round(totalAmount * 100);
      const paymobOrder = await paymobCreateOrder({
        amountCents,
        currency,
        items: [],
        merchant_order_id: payment._id.toString(),
      });
      const paymentKeyResp = await paymobCreatePaymentKey({
        amountCents,
        currency,
        orderId: paymobOrder.id,
        billingData: billing_data || {},
        integrationId: process.env.PAYMOB_INTEGRATION_ID,
      });
      const paymentToken = paymentKeyResp.token;
      const iframeUrl = paymobBuildIframeUrl({ paymentToken, iframeId: process.env.PAYMOB_IFRAME_ID });
      payment.gateway_ref = paymobOrder.id;
      await payment.save();

      return res.status(201).json({ iframeUrl, paymentId: payment._id, paymobOrderId: paymobOrder.id });
    } else if (payment_method === "fake") {
      const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
      const link = createFakePaymentLink({ paymentId: payment._id, baseUrl });
      payment.gateway_ref = `fake_${payment._id}`;
      await payment.save();
      return res.status(201).json({ simulateUrl: link, paymentId: payment._id });
    } else {
      return res.status(400).json({ message: "Unsupported payment method. Supported: stripe, paypal, paymob, fake" });
    }
  } catch (error) {
    console.error("createPayment error:", error);
    res.status(500).json({ message: "Error processing payment", error: error.message });
  }
};

const getStudentPayments = async (req, res) => {
  try {
    const studentId = req.user.id;
    const payments = await PaymentModel.find({ student_id: studentId }).sort({ payment_date: -1 });
    res.status(200).json({ count: payments.length, payments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllPayments = async (req, res) => {
  try {
    const { status, teacher_id, student_id } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (teacher_id) filter.teacher_id = teacher_id;
    if (student_id) filter.student_id = student_id;

    const payments = await PaymentModel.find(filter).sort({ payment_date: -1 });
    res.status(200).json({ count: payments.length, payments });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createPayment,
  getStudentPayments,
  getAllPayments,
  finalizePayment,
};