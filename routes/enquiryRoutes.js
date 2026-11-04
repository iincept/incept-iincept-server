const express = require("express");
const router = express.Router();
const {
  createEnquiry,
  adminGetEnquiries,
  adminUpdateEnquiryStatus,
  adminDeleteEnquiry,
} = require("../controllers/enquiryController");
const { protect, admin } = require("../middleware/authMiddleware");
const { reviewLimiter } = require("../middleware/rateLimiter");
const { validate, enquirySchema } = require("../middleware/validate");

// Public route for customers to submit bulk enquiries
router.post("/", reviewLimiter, validate(enquirySchema), createEnquiry);

// Protected routes for administrator panel
router.get("/admin", protect, admin, adminGetEnquiries);
router.put("/admin/:id/status", protect, admin, adminUpdateEnquiryStatus);
router.delete("/admin/:id", protect, admin, adminDeleteEnquiry);

module.exports = router;
