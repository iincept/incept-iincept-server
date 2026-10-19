const mongoose = require("mongoose");

const VariantSchema = new mongoose.Schema({
  size: String,
  bandSize: String,
  connectivity: String,
  color: String,
  colorHex: { type: String, trim: true, default: "" },
  storage: String,
  ram: String,
  glass: String,
  processor: String,
  chip: String,
  accessoriesSize: String,
  displayTitle: String,
  title: String,
  price: { type: Number, required: true, min: [0, "Variant price cannot be negative"] },
  discountPrice: { type: Number, min: [0, "Variant discount price cannot be negative"] },
  discountPercent: Number,
  discount: Number,
  discountInput: mongoose.Schema.Types.Mixed,
  stock: { type: Number, default: 0, min: [0, "Variant stock cannot be negative"] },
  sku: String,
  partNumber: String,
  modelNumber: String,
  images: [String]
}, { strict: false });

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Product title is required"],
      trim: true,
      maxlength: [200, "Product title cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
    },
    discountPrice: {
      type: Number,
      default: 0,
      min: [0, "Discount price cannot be negative"],
    },
    images: {
      type: [String],
      required: [true, "Product images are required"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    brand: {
      type: String,
      required: [true, "Brand is required"],
    },
    stock: {
      type: Number,
      required: [true, "Product stock is required"],
      default: 0,
      min: [0, "Stock cannot be negative"],
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be less than 0"],
      max: [5, "Rating cannot exceed 5"],
    },
    sizes: {
      type: [String],
      default: [],
    },
    accessoriesSizes: {
      type: [String],
      default: [],
    },
    bandSizes: {
      type: [String],
      default: [],
    },
    connectivities: {
      type: [String],
      default: [],
    },
    displayImage: {
      type: String,
      default: "",
    },
    colorImages: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    colors: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    storage: {
      type: [String],
      default: [],
    },
    ram: {
      type: [String],
      default: [],
    },
    glasses: {
      type: [String],
      default: [],
    },
    processors: {
      type: [String],
      default: [],
    },
    material: {
      type: [String],
      default: [],
    },
    features: {
      type: [String],
      default: [],
    },
    sold: {
      type: Number,
      default: 0,
    },
    partNumber: {
      type: String,
      default: "",
    },
    modelNumber: {
      type: String,
      default: "",
    },
    variants: {
      type: [VariantSchema],
      default: [],
    },
  },
  { timestamps: true, strict: false }
);

module.exports = mongoose.model("Product", productSchema);
