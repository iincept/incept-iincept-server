const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Generate JWT Token
const generateToken = (user) => {
  const id = typeof user === 'object' ? user._id : user;
  const email = typeof user === 'object' ? user.email : '';
  const role = typeof user === 'object' ? user.role : '';
  return jwt.sign({ id, email, role }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// Register a new user
const register = async (req, res) => {
  try {
    const { name, email, password, gender, dateOfBirth, isStudentOrTeacher } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create user with default role "user"
    const user = await User.create({
      name,
      email,
      password,
      role: "user",
      gender: gender || "",
      dateOfBirth: dateOfBirth || "",
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

    // 1. Direct email match
    let user = await User.findOne({ email: cleanLower });

    // 2. If 'admin' or 'system admin', alias to primary admin account
    if (!user && (cleanLower === 'admin' || cleanLower === 'system admin')) {
      user = await User.findOne({ email: 'admin@iincept.com' });
    }

    // 3. Match by name (case-insensitive), prioritizing admin users
    if (!user) {
      const escaped = cleanLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const candidates = await User.find({ name: new RegExp(`^${escaped}$`, "i") });
      if (candidates && candidates.length > 0) {
        user = candidates.find(u => u.role === 'admin') || candidates[0];
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
    const user = await User.findById(req.user._id).select("-password");
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
    const users = await User.find({}).select("-password");
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

    const { name, email, password } = req.body;

    if (name) user.name = name;

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      if (email.toLowerCase() !== user.email.toLowerCase()) {
        const emailExists = await User.findOne({ email: email.toLowerCase() });
        if (emailExists) {
          return res.status(400).json({ message: "Email already in use" });
        }
        user.email = email;
      }
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }
      user.password = password;
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
