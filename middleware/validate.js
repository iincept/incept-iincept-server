const { z } = require("zod");

/**
 * Reusable express middleware for validating request bodies using Zod schemas.
 * Ensures consistent JSON response: { message: "...", field: "..." } matching frontend expectations.
 */
const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse(req.body);
    req.body = parsed;
    next();
  } catch (error) {
    const issues = error.issues || error.errors;
    if (issues && Array.isArray(issues) && issues.length > 0) {
      const firstIssue = issues[0];
      return res.status(400).json({
        message: firstIssue.message || "Invalid request payload",
        field: firstIssue.path ? firstIssue.path.join(".") : undefined,
      });
    }
    return res.status(400).json({ message: "Invalid request payload" });
  }
};

// 1. User Registration Schema
const registerSchema = z
  .object({
    name: z
      .string({ required_error: "Name is required" })
      .trim()
      .min(1, "Name cannot be empty")
      .max(100, "Name cannot exceed 100 characters"),
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Invalid email format"),
    password: z
      .string({ required_error: "Password is required" })
      .min(6, "Password must be at least 6 characters long")
      .max(128, "Password cannot exceed 128 characters"),
    gender: z.string().optional().default(""),
    dateOfBirth: z.string().optional().default(""),
    isStudentOrTeacher: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((val) => val === true || val === "true"),
  })
  .passthrough();

// 2. User Login Schema (supports email or username)
const loginSchema = z
  .object({
    email: z.string().trim().optional(),
    username: z.string().trim().optional(),
    password: z
      .string({ required_error: "Password is required" })
      .min(1, "Email or username and password are required"),
  })
  .passthrough()
  .refine(
    (data) => (data.email && data.email.length > 0) || (data.username && data.username.length > 0),
    { message: "Email or username and password are required", path: ["email"] }
  );

// 3. Forgot Password Schema
const forgotPasswordSchema = z
  .object({
    email: z
      .string({ required_error: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Invalid email format"),
  })
  .passthrough();

// 4. Reset Password Schema
const resetPasswordSchema = z
  .object({
    token: z
      .string({ required_error: "Token is required" })
      .trim()
      .min(1, "Token and password are required"),
    password: z
      .string({ required_error: "Password is required" })
      .min(6, "Password must be at least 6 characters long")
      .max(128, "Password cannot exceed 128 characters"),
  })
  .passthrough();

// 5. Product Review Schema
const reviewSchema = z
  .object({
    product: z.string().trim().optional(),
    productId: z.string().trim().optional(),
    rating: z
      .union([z.number(), z.string()], { required_error: "Rating is required" })
      .transform((val) => Number(val))
      .refine((n) => !isNaN(n) && n >= 1 && n <= 5, {
        message: "Rating must be between 1 and 5",
      }),
    comment: z
      .string()
      .trim()
      .max(2000, "Comment cannot exceed 2000 characters")
      .optional()
      .default(""),
  })
  .passthrough()
  .refine((data) => Boolean(data.product || data.productId), {
    message: "Product ID and rating are required",
    path: ["product"],
  })
  .transform((data) => ({
    ...data,
    product: data.product || data.productId,
  }));

// 6. User Address Schema
const addressSchema = z
  .object({
    fullName: z
      .string({ required_error: "All fields are required" })
      .trim()
      .min(1, "All fields are required")
      .max(100),
    phone: z
      .string({ required_error: "All fields are required" })
      .trim()
      .min(5, "All fields are required")
      .max(20),
    address: z
      .string({ required_error: "All fields are required" })
      .trim()
      .min(1, "All fields are required")
      .max(500),
    city: z
      .string({ required_error: "All fields are required" })
      .trim()
      .min(1, "All fields are required")
      .max(100),
    state: z
      .string({ required_error: "All fields are required" })
      .trim()
      .min(1, "All fields are required")
      .max(100),
    pincode: z
      .union([z.string(), z.number()], { required_error: "All fields are required" })
      .transform(String)
      .refine((s) => s.trim().length >= 3 && s.trim().length <= 15, {
        message: "All fields are required",
      }),
    isDefault: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((val) => val === true || val === "true"),
  })
  .passthrough();

// 7. Bulk Business Enquiry Schema
const enquirySchema = z
  .object({
    fullName: z
      .string({ required_error: "Please fill all required fields" })
      .trim()
      .min(1, "Please fill all required fields")
      .max(100),
    companyName: z
      .string({ required_error: "Please fill all required fields" })
      .trim()
      .min(1, "Please fill all required fields")
      .max(150),
    email: z
      .string({ required_error: "Please fill all required fields" })
      .trim()
      .toLowerCase()
      .email("Invalid email format"),
    phone: z
      .string({ required_error: "Please fill all required fields" })
      .trim()
      .min(5, "Please fill all required fields")
      .max(25),
    productInterest: z
      .string({ required_error: "Please fill all required fields" })
      .trim()
      .min(1, "Please fill all required fields")
      .max(200),
    quantity: z
      .union([z.string(), z.number()], { required_error: "Please fill all required fields" })
      .transform(String)
      .refine((s) => s.trim().length > 0, {
        message: "Please fill all required fields",
      }),
    gstin: z.string().trim().optional().default(""),
    targetPrice: z
      .union([z.string(), z.number()])
      .optional()
      .transform((v) => (v !== undefined ? String(v) : "")),
    message: z.string().trim().max(3000).optional().default(""),
  })
  .passthrough();

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  reviewSchema,
  addressSchema,
  enquirySchema,
};
