const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderItems: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        variantId: {
          type: mongoose.Schema.Types.ObjectId,
          default: null,
        },
        variant: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
        },
      },
    ],
    shippingAddress: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    paymentMethod: {
      type: String,
      required: [true, "Payment method is required"],
    },
    paymentStatus: {
      type: String,
      default: "Pending",
      enum: ["Pending", "Paid", "Failed"],
    },
    orderStatus: {
      type: String,
      default: "Pending",
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Return Requested", "Returned", "Refunded"],
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    couponCode: {
      type: String,
      default: "",
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    razorpayOrderId: {
      type: String,
      default: "",
    },
    razorpayPaymentId: {
      type: String,
      default: "",
    },
    razorpaySignature: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);

