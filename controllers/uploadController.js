const { uploadToCloudinary } = require("../config/cloudinary");

// Validate magic bytes for allowed image types (JPEG, PNG, WebP, AVIF)
// and reject text-based formats like SVG, HTML, or scripts
const isValidImageMagicBytes = (buffer) => {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 12) {
    return false;
  }

  // Reject text, SVG, HTML, and script tags in file header
  const preview = buffer.slice(0, 512).toString("utf8").toLowerCase();
  if (
    preview.includes("<svg") ||
    preview.includes("<?xml") ||
    preview.includes("<html") ||
    preview.includes("<!doctype") ||
    preview.includes("<script")
  ) {
    return false;
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return true;
  }

  // 3. WebP: RIFF (bytes 0-3) and WEBP (bytes 8-11)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return true;
  }

  // 4. AVIF: bytes 4-7 are 'ftyp' and brand is 'avif' / 'avis' / 'mif1'
  if (
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70
  ) {
    const brand = buffer.slice(8, 12).toString("ascii").toLowerCase();
    if (brand === "avif" || brand === "avis" || brand === "mif1") {
      return true;
    }
  }

  return false;
};

// Upload Single File
const uploadSingle = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Verify magic bytes / file signature
    if (!isValidImageMagicBytes(req.file.buffer)) {
      return res.status(400).json({
        message: "Invalid image file signature or corrupted image format. Only JPEG, PNG, WebP, and AVIF are permitted.",
      });
    }

    const result = await uploadToCloudinary(req.file.buffer, req.file.originalname);

    res.status(200).json({
      url: result.secure_url,
      imageUrl: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Upload Multiple Files
const uploadMultiple = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    // Verify magic bytes for all files
    for (const file of req.files) {
      if (!isValidImageMagicBytes(file.buffer)) {
        return res.status(400).json({
          message: `Invalid image file signature in file "${file.originalname}". Only JPEG, PNG, WebP, and AVIF are permitted.`,
        });
      }
    }

    const uploadPromises = req.files.map((file) =>
      uploadToCloudinary(file.buffer, file.originalname)
    );

    const results = await Promise.all(uploadPromises);

    const response = results.map((result) => ({
      url: result.secure_url,
      public_id: result.public_id,
    }));

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  uploadSingle,
  uploadMultiple,
};
