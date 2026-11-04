const express = require("express");
const router = express.Router();
const {
  addAddress,
  updateAddress,
  deleteAddress,
  getAddresses,
} = require("../controllers/addressController");
const { protect } = require("../middleware/authMiddleware");
const { validate, addressSchema } = require("../middleware/validate");

// All routes require authentication
router.use(protect);

router.route("/")
  .get(getAddresses)
  .post(validate(addressSchema), addAddress);

router.route("/:id")
  .put(updateAddress)
  .delete(deleteAddress);

module.exports = router;
