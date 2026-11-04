const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");

// Allowed spreadsheet extensions
const ALLOWED_EXCEL_EXTENSIONS = [".xlsx", ".xls", ".csv"];

// Multer memory storage with 10MB limit to prevent server memory exhaustion
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB maximum limit
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!ALLOWED_EXCEL_EXTENSIONS.includes(ext)) {
      return cb(new Error("Only Excel spreadsheets (.xlsx, .xls) and CSV files (.csv) are allowed"), false);
    }
    // Explicitly reject executables, scripts, and SVG
    if (ext === ".svg" || ext === ".html" || ext === ".php" || ext === ".exe" || ext === ".js" || ext === ".sh") {
      return cb(new Error("Invalid file format"), false);
    }
    cb(null, true);
  },
});

// Middleware to handle Multer upload errors cleanly
const handleExcelUpload = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            message: "Excel upload error: File size exceeds the maximum allowed limit of 10MB",
          });
        }
        return res.status(400).json({ message: `Excel upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  };
};

const {
  createProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  getProductById,
  adminGetStockHistory,
  exportProductsExcel,
  previewImportProductsExcel,
  importProductsExcel,
} = require("../controllers/productController");
const { protect, admin } = require("../middleware/authMiddleware");

// Public routes
router.get("/", getProducts);

// Excel export & import routes (MUST be before /:id)
router.get("/export-excel", protect, admin, exportProductsExcel);
router.post("/import-preview", protect, admin, handleExcelUpload(excelUpload.single("file")), previewImportProductsExcel);
router.post("/import-excel", protect, admin, handleExcelUpload(excelUpload.single("file")), importProductsExcel);

router.get("/:id", getProductById);

// Protected routes (Admin only)
router.get("/admin/stock-history", protect, admin, adminGetStockHistory);
router.post("/", protect, admin, createProduct);
router.put("/:id", protect, admin, updateProduct);
router.delete("/:id", protect, admin, deleteProduct);

module.exports = router;

