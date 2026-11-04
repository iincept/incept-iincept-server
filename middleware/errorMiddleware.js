/**
 * 404 Not Found Middleware for undefined API endpoints
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Safe Centralized Production Error Handling Middleware
 * Ensures all errors return clean JSON and suppresses sensitive stack traces in production.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || "An unexpected internal server error occurred";

  // 1. CORS origin blocked error
  if (err.message && err.message.startsWith("CORS blocked")) {
    statusCode = 403;
    message = err.message;
  }

  // 2. Mongoose Invalid ObjectId (CastError)
  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 400;
    message = "Invalid resource identifier format";
  }

  // 3. Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    statusCode = 400;
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : "field";
    message = `Duplicate value entered for ${field}. Please use another value.`;
  }

  // 4. Mongoose Validation Error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  // 5. JSON Web Token Errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Not authorized, token failed";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Not authorized, token expired";
  }

  // 6. Payload Too Large Error
  if (err.type === "entity.too.large" || err.status === 413) {
    statusCode = 413;
    message = "Request payload exceeds allowed limit";
  }

  // Build clean JSON response
  const response = {
    message,
  };

  // Only expose stack traces in non-production environments
  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = {
  notFound,
  errorHandler,
};
