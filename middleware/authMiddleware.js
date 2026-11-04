const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    try {
      // Extract and validate token string from header
      token = req.headers.authorization.split(" ")[1];
      if (!token || typeof token !== "string" || token.trim() === "") {
        return res.status(401).json({ message: "Not authorized, invalid token format" });
      }

      // Verify token with explicit algorithm constraint to prevent algorithm confusion attacks
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ["HS256"],
      });

      // Get user from the token, attach to request object
      const mongoose = require("mongoose");
      if (decoded.id && mongoose.Types.ObjectId.isValid(decoded.id)) {
        req.user = await User.findById(decoded.id).select(
          "-password -resetPasswordToken -resetPasswordExpire -__v"
        );
      }

      // Safe fallback lookup by verified email for this specific account
      if (!req.user && decoded.email) {
        req.user = await User.findOne({ email: String(decoded.email).toLowerCase() }).select(
          "-password -resetPasswordToken -resetPasswordExpire -__v"
        );
      }

      if (!req.user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
      }

      return next();
    } catch (error) {
      console.error("Auth middleware error:", error.message);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  return res.status(401).json({ message: "Not authorized, no token" });
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Not authorized as an admin" });
  }
};

module.exports = { protect, admin };
