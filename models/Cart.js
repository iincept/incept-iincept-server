const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      default: 1,
      min: [1, "Quantity must be at least 1"],
    },
    variantId: {
      type: String,
      default: "",
    },
    name: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      default: 0,
    },
    image: {
      type: String,
      default: "",
    },
    color: {
      type: String,
      default: "",
    },
    size: {
      type: String,
      default: "",
    },
    caseSize: {
      type: String,
      default: "",
    },
    strapSize: {
      type: String,
      default: "",
    },
    accessoriesSize: {
      type: String,
      default: "",
    },
    bandSize: {
      type: String,
      default: "",
    },
    connectivity: {
      type: String,
      default: "",
    },
    storage: {
      type: String,
      default: "",
    },
    ram: {
      type: String,
      default: "",
    },
    glass: {
      type: String,
      default: "",
    },
    processor: {
      type: String,
      default: "",
    },
    partNumber: {
      type: String,
      default: "",
    },
    appleCare: {
      type: Boolean,
      default: false,
    },
    appleCarePlan: {
      type: String,
      default: "",
    },
    appleCareCost: {
      type: Number,
      default: 0,
    },
    appleCareSku: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Index to ensure fast querying per user and variant
cartSchema.index({ user: 1, variantId: 1 });

module.exports = mongoose.model("Cart", cartSchema);
