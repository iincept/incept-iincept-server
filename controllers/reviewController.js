const Review = require("../models/Review");
const Product = require("../models/Product");
const mongoose = require("mongoose");

// Helper to update product average rating
const updateProductAverageRating = async (productId) => {
  const reviews = await Review.find({ product: productId });
  const averageRating =
    reviews.length > 0
      ? Number((reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1))
      : 0;

  await Product.findByIdAndUpdate(productId, { rating: averageRating });
  return averageRating;
};

// Add or Update Review (Protected)
const addReview = async (req, res) => {
  try {
    const { product: productId, rating, comment } = req.body;
    const userId = req.user._id;

    if (!productId || rating === undefined) {
      return res.status(400).json({ message: "Product ID and rating are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product identifier format" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if user already reviewed this product
    let review = await Review.findOne({ user: userId, product: productId });

    if (review) {
      review.rating = Number(rating);
      review.comment = comment;
      await review.save();
    } else {
      review = await Review.create({
        user: userId,
        product: productId,
        rating: Number(rating),
        comment,
      });
    }

    // Recalculate average rating of the product
    const newAverageRating = await updateProductAverageRating(productId);

    res.status(201).json({ review, newAverageRating });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Review (Protected)
const deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ message: "Invalid review identifier format" });
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Verify ownership (unless admin)
    if (review.user.toString() !== userId.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to delete this review" });
    }

    const productId = review.product;

    await Review.findByIdAndDelete(reviewId);

    // Recalculate average rating of the product
    const newAverageRating = await updateProductAverageRating(productId);

    res.status(200).json({ message: "Review deleted successfully", newAverageRating });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Product Reviews (Public)
const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(200).json([]);
    }

    const reviews = await Review.find({ product: productId })
      .populate("user", "name avatar")
      .sort({ createdAt: -1 });

    const Order = require("../models/Order");

    // Add verified buyer tag to each review
    const enrichedReviews = await Promise.all(
      reviews.map(async (review) => {
        let isVerified = false;
        if (review.user) {
          const hasPurchased = await Order.findOne({
            user: review.user._id,
            "orderItems.product": productId,
            orderStatus: "Delivered"
          });
          if (hasPurchased) {
            isVerified = true;
          }
        }
        return {
          ...review.toObject(),
          isVerified
        };
      })
    );

    res.status(200).json(enrichedReviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addReview,
  deleteReview,
  getProductReviews,
};
