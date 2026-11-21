const express = require("express");
const router = express.Router();
const {
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  getCart,
  mergeCart,
} = require("../controllers/cartController");
const { protect } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(protect);

router.post("/merge", mergeCart);

router.delete("/clear", clearCart);

router.route("/")
  .get(getCart)
  .post(addToCart)
  .put(updateQuantity)
  .delete(removeFromCart);

router.route("/:productId")
  .put(updateQuantity)
  .delete(removeFromCart);

module.exports = router;
