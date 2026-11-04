const Address = require("../models/Address");
const mongoose = require("mongoose");

// Add Address (Protected)
const addAddress = async (req, res) => {
  try {
    const { fullName, phone, address, city, state, pincode, isDefault = false } = req.body;
    const userId = req.user._id;

    if (!fullName || !phone || !address || !city || !state || !pincode) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // If setting as default, clear any other default address for this user
    if (isDefault) {
      await Address.updateMany({ user: userId }, { isDefault: false });
    }

    const newAddress = await Address.create({
      user: userId,
      fullName,
      phone,
      address,
      city,
      state,
      pincode,
      isDefault,
    });

    res.status(201).json(newAddress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Address (Protected)
const updateAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({ message: "Invalid address identifier format" });
    }

    const { fullName, phone, address, city, state, pincode, isDefault } = req.body;

    const existingAddress = await Address.findOne({ _id: addressId, user: userId });
    if (!existingAddress) {
      return res.status(404).json({ message: "Address not found" });
    }

    // If changing isDefault to true, clear any other default address
    if (isDefault === true) {
      await Address.updateMany({ user: userId }, { isDefault: false });
      existingAddress.isDefault = true;
    } else if (isDefault === false) {
      existingAddress.isDefault = false;
    }

    if (fullName) existingAddress.fullName = fullName;
    if (phone) existingAddress.phone = phone;
    if (address) existingAddress.address = address;
    if (city) existingAddress.city = city;
    if (state) existingAddress.state = state;
    if (pincode) existingAddress.pincode = pincode;

    const updatedAddress = await existingAddress.save();
    res.status(200).json(updatedAddress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete Address (Protected)
const deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({ message: "Invalid address identifier format" });
    }

    const address = await Address.findOne({ _id: addressId, user: userId });
    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    await Address.findByIdAndDelete(addressId);
    res.status(200).json({ message: "Address deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Addresses (Protected)
const getAddresses = async (req, res) => {
  try {
    const userId = req.user._id;
    const addresses = await Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });
    res.status(200).json(addresses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addAddress,
  updateAddress,
  deleteAddress,
  getAddresses,
};
