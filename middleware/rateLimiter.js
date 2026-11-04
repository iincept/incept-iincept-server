const rateLimit = require("express-rate-limit");

// Standard JSON handler for rate limit violations
const rateLimitHandler = (message) => (req, res, next, options) => {
  res.status(options.statusCode).json({
    message: message || "Too many requests from this IP, please try again later.",
  });
};

// 1. Strict Limiter for sensitive authentication endpoints (login, register)
// 30 attempts per 15 minutes window
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("Too many authentication attempts from this IP, please try again after 15 minutes."),
});

// 2. Sensitive Limiter for password reset endpoints (forgot-password, reset-password)
// 10 requests per 15 minutes
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("Too many password reset requests from this IP, please try again after 15 minutes."),
});

// 3. Orders / Checkout Limiter to prevent automated carding or checkout floods
// 40 orders per 15 minutes
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 1000 : 40,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("Too many orders initiated in a short period. Please wait a few minutes before trying again."),
});

// 4. Review & Enquiry Limiter to prevent spam
// 25 submissions per 15 minutes
const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 1000 : 25,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("Too many submissions received. Please wait a few minutes before trying again."),
});

// 5. General Global API Limiter
// 600 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 5000 : 600,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler("Too many requests from this IP, please try again after a few minutes."),
});

module.exports = {
  authLimiter,
  passwordResetLimiter,
  orderLimiter,
  reviewLimiter,
  apiLimiter,
};
