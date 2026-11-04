const express = require("express");
const router = express.Router();
const {
  addReview,
  deleteReview,
  getProductReviews,
} = require("../controllers/reviewController");
const { protect } = require("../middleware/authMiddleware");
const { reviewLimiter } = require("../middleware/rateLimiter");
const { validate, reviewSchema } = require("../middleware/validate");

// Public endpoint to read reviews
router.get("/:productId", getProductReviews);

// Protected endpoints to write/delete reviews
router.post("/", protect, reviewLimiter, validate(reviewSchema), addReview);
router.delete("/:id", protect, deleteReview);

module.exports = router;
