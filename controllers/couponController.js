const Coupon = require("../models/Coupon");
const Cart = require("../models/Cart");
const mongoose = require("mongoose");

// Create Coupon (Admin only)
const createCoupon = async (req, res) => {
  try {
    const { code, discount, minimumAmount = 0, expiryDate, maxDiscountAmount, usageLimit, perUserLimit } = req.body;

    if (!code || discount === undefined || !expiryDate) {
      return res.status(400).json({ message: "Code, discount, and expiry date are required" });
    }

    const discountNum = Number(discount);
    if (isNaN(discountNum) || discountNum <= 0 || discountNum > 100) {
      return res.status(400).json({ message: "Discount must be a valid percentage between 1 and 100" });
    }

    const minAmountNum = Math.max(0, Number(minimumAmount) || 0);

    let parsedMaxDiscount = null;
    if (maxDiscountAmount !== undefined && maxDiscountAmount !== null && maxDiscountAmount !== "") {
      const parsed = Number(maxDiscountAmount);
      if (isNaN(parsed) || parsed < 0) {
        return res.status(400).json({ message: "Maximum discount amount must be a positive number" });
      }
      parsedMaxDiscount = parsed;
    }

    let parsedUsageLimit = null;
    if (usageLimit !== undefined && usageLimit !== null && usageLimit !== "") {
      const parsed = Number(usageLimit);
      if (isNaN(parsed) || parsed < 1) {
        return res.status(400).json({ message: "Usage limit must be at least 1" });
      }
      parsedUsageLimit = parsed;
    }

    let parsedPerUserLimit = null;
    if (perUserLimit !== undefined && perUserLimit !== null && perUserLimit !== "") {
      const parsed = Number(perUserLimit);
      if (isNaN(parsed) || parsed < 1) {
        return res.status(400).json({ message: "Per-user limit must be at least 1" });
      }
      parsedPerUserLimit = parsed;
    }

    const couponExists = await Coupon.findOne({ code: code.toUpperCase() });
    if (couponExists) {
      return res.status(400).json({ message: "Coupon code already exists" });
    }

    const couponData = {
      code: code.toUpperCase(),
      discount: discountNum,
      minimumAmount: minAmountNum,
      expiryDate,
    };
    if (parsedMaxDiscount !== null) couponData.maxDiscountAmount = parsedMaxDiscount;
    if (parsedUsageLimit !== null) couponData.usageLimit = parsedUsageLimit;
    if (parsedPerUserLimit !== null) couponData.perUserLimit = parsedPerUserLimit;

    const coupon = await Coupon.create(couponData);

    res.status(201).json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Coupon (Admin only)
const deleteCoupon = async (req, res) => {
  try {
    const couponId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(couponId)) {
      return res.status(400).json({ message: "Invalid coupon identifier format" });
    }

    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    await Coupon.findByIdAndDelete(couponId);
    res.status(200).json({ message: "Coupon deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Coupons (Admin only)
const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 });
    res.status(200).json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Apply Coupon (Protected, User)
const applyCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user._id;

    if (!code) {
      return res.status(400).json({ message: "Coupon code is required" });
    }

    // Find the coupon
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) {
      return res.status(400).json({ message: "Invalid coupon code" });
    }

    // Check if expired
    if (new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({ message: "Coupon has expired" });
    }

    // Check usage limit if configured
    if (typeof coupon.usageLimit === "number" && coupon.usageLimit > 0) {
      if ((coupon.usedCount || 0) >= coupon.usageLimit) {
        return res.status(400).json({ message: "Coupon usage limit has been reached" });
      }
    }

    // Check per-user usage limit if configured
    if (typeof coupon.perUserLimit === "number" && coupon.perUserLimit > 0) {
      const Order = require("../models/Order");
      const userOrdersCount = await Order.countDocuments({
        user: userId,
        couponCode: coupon.code,
        orderStatus: { $ne: "Cancelled" },
      });
      if (userOrdersCount >= coupon.perUserLimit) {
        return res.status(400).json({ message: "You have reached the usage limit for this coupon" });
      }
    }

    // Get user's cart items
    const cartItems = await Cart.find({ user: userId }).populate("product");
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Calculate total
    const cartTotal = cartItems.reduce((acc, curr) => {
      if (curr.product) {
        return acc + curr.quantity * curr.product.price;
      }
      return acc;
    }, 0);

    // Verify minimum cart amount requirement
    if (cartTotal < (coupon.minimumAmount || 0)) {
      return res.status(400).json({
        message: `Minimum purchase amount of ₹${coupon.minimumAmount} required. Current total is ₹${cartTotal}.`,
      });
    }

    // Calculate discount amount (percentage)
    const discountPct = Math.min(100, Math.max(0, Number(coupon.discount) || 0));
    let discountAmount = Number(((cartTotal * discountPct) / 100).toFixed(2));

    // Cap at maximum discount amount if configured
    if (typeof coupon.maxDiscountAmount === "number" && coupon.maxDiscountAmount > 0) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
    }

    discountAmount = Math.min(cartTotal, discountAmount);
    const discountedTotal = Number(Math.max(0, cartTotal - discountAmount).toFixed(2));

    res.status(200).json({
      success: true,
      code: coupon.code,
      discount: coupon.discount,
      originalTotal: cartTotal,
      discountAmount,
      discountedTotal,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createCoupon,
  deleteCoupon,
  getCoupons,
  applyCoupon,
};
