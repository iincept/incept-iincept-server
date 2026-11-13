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
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// 3. Robust & Strict CORS Configuration
const defaultAllowedOrigins = [
  "https://iincept.com",
  "https://www.iincept.com",
  "https://admin.iincept.com",
  "https://iincept-client.vercel.app",
  "https://iincept-admin.vercel.app",
  "https://iincept-server.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://localhost:5175",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5175",
];

const getAllowedOrigins = () => {
  const configuredOrigins = [
    process.env.FRONTEND_URL,
    process.env.CLIENT_URL,
    process.env.ADMIN_URL,
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : []),
    ...defaultAllowedOrigins,
  ]
    .map((url) => (url ? url.trim().replace(/\/+$/, "") : ""))
    .filter(Boolean);

  return Array.from(new Set(configuredOrigins));
};

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  const cleanOrigin = origin.trim().replace(/\/+$/, "");
  const allowed = getAllowedOrigins();

  if (allowed.includes(cleanOrigin)) return true;

  // Safely allow legitimate project Vercel deployments (production & branch previews)
  // Strictly matches: https://iincept-admin*.vercel.app, https://iincept-client*.vercel.app, https://iincept*.vercel.app
  if (/^https:\/\/(iincept-admin|iincept-client|iincept)[a-z0-9-_]*\.vercel\.app$/i.test(cleanOrigin)) {
    return true;
  }

  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server) or matched origins
    if (!origin || isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: Origin ${origin} is not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"],
  maxAge: 86400,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// 4. Global API Rate Limiter
app.use("/api", apiLimiter);

app.use("/uploads", express.static(path.join(__dirname, "../client/public/uploads"), {
  maxAge: '7d',
  immutable: true,
}));
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  maxAge: '7d',
  immutable: true,
}));
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

