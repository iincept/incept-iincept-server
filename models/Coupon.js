const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [3, "Coupon code is too short"],
      maxlength: [30, "Coupon code is too long"],
    },
    discount: {
      type: Number,
      required: [true, "Discount is required"],
      min: [0, "Discount cannot be negative"],
    },
    minimumAmount: {
      type: Number,
      required: [true, "Minimum amount is required"],
      default: 0,
      min: [0, "Minimum amount cannot be negative"],
    },
    expiryDate: {
      type: Date,
      required: [true, "Expiry date is required"],
    },
    maxDiscountAmount: {
      type: Number,
      default: null,
      min: [0, "Maximum discount cannot be negative"],
    },
    usageLimit: {
      type: Number,
      default: null,
      min: [1, "Usage limit must be at least 1"],
    },
    usedCount: {
      type: Number,
      default: 0,
      min: [0, "Used count cannot be negative"],
    },
    perUserLimit: {
      type: Number,
      default: null,
      min: [1, "Per-user limit must be at least 1"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);
