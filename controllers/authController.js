const User = require("../models/User");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// Generate JWT Token
const generateToken = (user) => {
  const id = typeof user === 'object' ? user._id : user;
  const email = typeof user === 'object' ? user.email : '';
  const role = typeof user === 'object' ? user.role : '';
  const expiresIn = process.env.JWT_EXPIRE || "30d";
  return jwt.sign({ id, email, role }, process.env.JWT_SECRET, {
    expiresIn,
    algorithm: "HS256",
  });
};

// Register a new user
const register = async (req, res) => {
  try {
    const { name, email, password, gender, dateOfBirth, isStudentOrTeacher } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!cleanName) {
      return res.status(400).json({ message: "Name must be a valid non-empty string" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    // Check if user already exists using normalized email
    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create user with default role "user" (strictly ignore any role field passed in payload)
    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password,
      role: "user",
      gender: typeof gender === "string" ? gender.trim() : "",
      dateOfBirth: typeof dateOfBirth === "string" ? dateOfBirth.trim() : "",
      isStudentOrTeacher: !!isStudentOrTeacher,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        isStudentOrTeacher: user.isStudentOrTeacher,
        token: generateToken(user),
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "User already exists" });
    }
    res.status(500).json({ message: error.message });
  }
};

// Login user (supports email or username)
const login = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const identifier = (email || username || "").trim();

    if (!identifier || !password) {
      return res.status(400).json({ message: "Email or username and password are required" });
    }

    const cleanLower = identifier.toLowerCase();
    const isEmail = cleanLower.includes("@");

    let user = null;

    if (isEmail) {
      // 1. Strict email match — never fall back to name search when an email is provided
      user = await User.findOne({ email: cleanLower });
    } else if (cleanLower === "admin" || cleanLower === "system admin") {
      // 2. Administrator alias support
      const adminEmail = (process.env.ADMIN_EMAIL || "admin@iincept.com").toLowerCase();
      user = await User.findOne({ email: adminEmail });
    } else {
      // 3. Username / Name match without email collision
      user = await User.findOne({ email: cleanLower });

      if (!user) {
        const escaped = cleanLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const candidates = await User.find({ name: new RegExp(`^${escaped}$`, "i") });

        if (candidates.length === 1) {
          user = candidates[0];
        } else if (candidates.length > 1) {
          // If multiple accounts share this exact display name, check against password
          // to prevent picking the wrong account or locking out users
          const matchedUsers = [];
          for (const candidate of candidates) {
            const isMatch = await candidate.comparePassword(password);
            if (isMatch) {
              matchedUsers.push(candidate);
            }
          }

          if (matchedUsers.length === 1) {
            user = matchedUsers[0];
          } else if (matchedUsers.length > 1) {
            return res.status(400).json({
              message: "Multiple accounts share this name. Please log in using your unique email address.",
            });
          } else {
            return res.status(401).json({ message: "Invalid email/username or password" });
          }
        }
      }
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid email/username or password" });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email/username or password" });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Logout user (client-side handles token clearance, API sends confirmation)
const logout = async (req, res) => {
  res.status(200).json({ message: "Logged out successfully" });
};

// Get current user profile (for auth verification testing)
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "-password -resetPasswordToken -resetPasswordExpire -__v"
    );
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all users (Admin only)
const getUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select("-password -resetPasswordToken -resetPasswordExpire -__v")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update user role (Admin only)
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role value" });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user identifier" });
    }

    // Prevent administrators from demoting their own account to avoid lockout
    if (req.user && req.user._id && req.user._id.toString() === req.params.id.toString() && role !== "admin") {
      return res.status(400).json({ message: "Administrators cannot demote their own account" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.role = role;
    await user.save();

    res.json({ message: "User role updated successfully", user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update current user profile
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { name, email, password, currentPassword, gender, dateOfBirth, isStudentOrTeacher } = req.body;

    // Verify current password before password change or sensitive changes when supplied
    if (currentPassword) {
      if (typeof currentPassword !== "string") {
        return res.status(400).json({ message: "Current password must be a string" });
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
    }

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ message: "Name must be a valid non-empty string" });
      }
      user.name = name.trim();
    }

    if (email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof email !== "string" || !emailRegex.test(email.trim())) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail !== user.email.toLowerCase()) {
        const emailExists = await User.findOne({ email: cleanEmail });
        if (emailExists) {
          return res.status(400).json({ message: "Email already in use" });
        }
        user.email = cleanEmail;
      }
    }

    if (password !== undefined && password !== "") {
      if (typeof password !== "string" || password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }
      user.password = password;
    }

    if (gender !== undefined && typeof gender === "string") {
      user.gender = gender.trim();
    }

    if (dateOfBirth !== undefined && typeof dateOfBirth === "string") {
      user.dateOfBirth = dateOfBirth.trim();
    }

    if (isStudentOrTeacher !== undefined) {
      user.isStudentOrTeacher = Boolean(isStudentOrTeacher);
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      gender: updatedUser.gender,
      dateOfBirth: updatedUser.dateOfBirth,
      isStudentOrTeacher: updatedUser.isStudentOrTeacher,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Request password reset token (Public)
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    // Anti-user enumeration: Return identical generic message whether account exists or not
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      });
    }

    // Generate cryptographically secure random token (32 bytes = 64 hex characters)
    const crypto = require("crypto");
    const token = crypto.randomBytes(32).toString("hex");

    // Hash token with SHA-256 and store expiration (30 minutes)
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save();

    // Dispatch reset URL via notification service (SMTP or simulated email)
    try {
      const { dispatchEmail } = require("../services/notificationService");
      const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
      const resetUrl = `${clientUrl}/reset-password?token=${token}`;
      const emailContent = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #111827;">Password Reset Request</h2>
          <p style="color: #4b5563;">Hello ${user.name || "Customer"},</p>
          <p style="color: #4b5563;">You requested a password reset for your account. Click the link below to set a new password. This link is valid for 30 minutes:</p>
          <div style="margin: 24px 0;">
            <a href="${resetUrl}" style="background-color: #0071e3; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #6b7280; font-size: 13px;">If you did not request this, please ignore this email and your password will remain unchanged.</p>
        </div>
      `;
      await dispatchEmail(user.email, "Password Reset Request - iiNCEPT Store", emailContent);
    } catch (emailErr) {
      console.error("Failed to dispatch password reset email:", emailErr.message);
    }

    // Return generic success response WITHOUT token
    return res.status(200).json({
      success: true,
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reset password using token (Public)
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: "Token and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    const crypto = require("crypto");
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired password reset token" });
    }

    user.password = password;
    user.resetPasswordToken = "";
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ success: true, message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
  logout,
  getProfile,
  getUsers,
  updateUserRole,
  updateProfile,
  forgotPassword,
  resetPassword,
};
