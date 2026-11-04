const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();
const { uploadSingle, uploadMultiple } = require("../controllers/uploadController");
const { protect, admin } = require("../middleware/authMiddleware");

// All upload routes require authenticated administrator access
router.use(protect, admin);

// Allowed image extensions and MIME types whitelist
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif"];
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

// Setup Multer memory storage
const storage = multer.memoryStorage();

// File filter (accept whitelisted images only; strictly reject SVG and executables)
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();

  // Explicitly reject SVG and dangerous extensions
  if (ext === ".svg" || ext === ".html" || ext === ".htm" || ext === ".php" || ext === ".js" || ext === ".sh" || ext === ".exe") {
    return cb(new Error("SVG files, HTML, and executable scripts are not allowed for security reasons"), false);
  }

  if (ALLOWED_EXTENSIONS.includes(ext) && ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error("Only standard image formats are allowed (jpg, jpeg, png, webp, avif)"), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter,
});

// Upload routes (protected for administrator image updates)
router.post("/", upload.single("image"), uploadSingle);
router.post("/single", upload.single("image"), uploadSingle);
router.post("/multiple", upload.array("images", 10), uploadMultiple);

// Error handling middleware for Multer errors
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Upload error: File too large. Maximum size is 5MB." });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
});

module.exports = router;
