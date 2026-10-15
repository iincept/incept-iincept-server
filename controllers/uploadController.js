const { uploadToCloudinary } = require("../config/cloudinary");

// Upload Single File
const uploadSingle = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
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
