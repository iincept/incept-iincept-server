const path = require("path");
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

connectDB();

const helmet = require("helmet");
const { apiLimiter } = require("./middleware/rateLimiter");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// 1. Helmet Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);

// 2. Reasonable JSON and URL-encoded body limits (prevent memory exhaustion DoS)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// 3. Strict CORS Configuration
const getAllowedOrigins = () => {
  const configuredOrigins = [
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    process.env.ADMIN_URL,
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : []),
  ]
    .map((url) => (url ? url.trim() : ""))
    .filter(Boolean);

  if (process.env.NODE_ENV !== "production") {
    const devOrigins = [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "http://localhost:5175",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5175",
    ];
    return Array.from(new Set([...configuredOrigins, ...devOrigins]));
  }

  return Array.from(new Set(configuredOrigins));
};

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server, curl, Postman, mobile, or requests with no origin
    if (!origin) return callback(null, true);

    const allowedOrigins = getAllowedOrigins();
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error(`CORS blocked: Origin ${origin} is not allowed`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"],
  maxAge: 86400,
};

app.use(cors(corsOptions));

// 4. Global API Rate Limiter
app.use("/api", apiLimiter);

app.use("/uploads", express.static(path.join(__dirname, "../client/public/uploads")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "../client/public")));

// Routes
const authRoutes = require("./routes/authRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const addressRoutes = require("./routes/addressRoutes");
const couponRoutes = require("./routes/couponRoutes");
const orderRoutes = require("./routes/orderRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const settingRoutes = require("./routes/settingRoutes");
const enquiryRoutes = require("./routes/enquiryRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/enquiries", enquiryRoutes);

// 5. Centralized Error Handling
app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  const PORT = process.env.PORT || 5088;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;

