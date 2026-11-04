const Enquiry = require("../models/Enquiry");
const mongoose = require("mongoose");

// Submit a new bulk business enquiry
const createEnquiry = async (req, res) => {
  try {
    const {
      fullName,
      companyName,
      email,
      phone,
      gstin,
      productInterest,
      quantity,
      targetPrice,
      message,
    } = req.body;

    if (!fullName || !companyName || !email || !phone || !productInterest || !quantity) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }

    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const enquiry = await Enquiry.create({
      fullName: typeof fullName === "string" ? fullName.trim() : fullName,
      companyName: typeof companyName === "string" ? companyName.trim() : companyName,
      email: cleanEmail,
      phone: typeof phone === "string" ? phone.trim() : phone,
      gstin: typeof gstin === "string" ? gstin.trim() : gstin,
      productInterest,
      quantity,
      targetPrice,
      message,
    });

    res.status(201).json({ success: true, message: "Enquiry submitted successfully", enquiry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Retrieve all enquiries (Admin only)
const adminGetEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.find({}).sort({ createdAt: -1 });
    res.status(200).json(enquiries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update enquiry status (Admin only)
const adminUpdateEnquiryStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!status) {
      return res.status(400).json({ message: "Status value is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid enquiry identifier format" });
    }

    const enquiry = await Enquiry.findById(id);
    if (!enquiry) {
      return res.status(404).json({ message: "Enquiry not found" });
    }

    enquiry.status = status;
    await enquiry.save();

    res.status(200).json({ success: true, message: "Status updated successfully", enquiry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete enquiry (Admin only)
const adminDeleteEnquiry = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid enquiry identifier format" });
    }

    const enquiry = await Enquiry.findByIdAndDelete(id);
    if (!enquiry) {
      return res.status(404).json({ message: "Enquiry not found" });
    }

    res.status(200).json({ success: true, message: "Enquiry deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createEnquiry,
  adminGetEnquiries,
  adminUpdateEnquiryStatus,
  adminDeleteEnquiry,
};
