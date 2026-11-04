const express = require("express");
const router = express.Router();
const {
  createOrder,
  getOrders,
  trackOrder,
  cancelOrder,
  adminGetOrders,
  adminUpdateStatus,
  verifyPayment,
  requestReturn,
  adminGetReturns,
  adminUpdateReturnStatus,
  adminGetSalesReport,
} = require("../controllers/orderController");
const { protect, admin } = require("../middleware/authMiddleware");
const { orderLimiter } = require("../middleware/rateLimiter");

// All routes require authentication
router.use(protect);

router.get("/razorpay-key", (req, res) => {
  res.status(200).json({ key: process.env.RAZORPAY_KEY_ID || "" });
});

// User endpoints
router.route("/")
  .get(getOrders)
  .post(orderLimiter, createOrder);

router.post("/verify", verifyPayment);

router.route("/:id")
  .get(trackOrder);

router.route("/:id/cancel")
  .put(cancelOrder);

router.route("/:id/return")
  .put(requestReturn);

// Admin endpoints
router.route("/admin/all")
  .get(admin, adminGetOrders);

router.route("/admin/returns")
  .get(admin, adminGetReturns);

router.route("/admin/returns/:id/status")
  .put(admin, adminUpdateReturnStatus);

router.route("/admin/sales-report")
  .get(admin, adminGetSalesReport);

router.route("/:id/status")
  .put(admin, adminUpdateStatus);

module.exports = router;
