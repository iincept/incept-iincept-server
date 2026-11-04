const Cart = require("../models/Cart");
const Product = require("../models/Product");

// Add To Cart
const addToCart = async (req, res) => {
  try {
    const productId = req.body.productId || req.body.product;
    const quantity = req.body.quantity !== undefined ? Number(req.body.quantity) : 1;
    const userId = req.user._id;

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Verify product exists and check stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Strictly validate stock (reject if out of stock or requested quantity exceeds available stock)
    const availableStock = typeof product.stock === "number" ? product.stock : 0;
    if (availableStock <= 0) {
      return res.status(400).json({ message: "Product is out of stock" });
    }
    if (quantity > availableStock) {
      return res.status(400).json({ message: `Insufficient stock. Only ${availableStock} available.` });
    }

    // Check if item is already in user's cart
    let cartItem = await Cart.findOne({ user: userId, product: productId });

    if (cartItem) {
      // Check if updating quantity exceeds stock
      const newQuantity = cartItem.quantity + Number(quantity);
      if (newQuantity > availableStock) {
        return res.status(400).json({ message: `Insufficient stock. Cannot add. Only ${availableStock} available.` });
      }
      cartItem.quantity = newQuantity;
      await cartItem.save();
    } else {
      cartItem = await Cart.create({
        user: userId,
        product: productId,
        quantity: Number(quantity),
      });
    }

    // Populate product details and return
    await cartItem.populate("product", "title price images brand stock");

    res.status(201).json(cartItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Quantity
const updateQuantity = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;
    const userId = req.user._id;

    if (quantity === undefined || Number(quantity) < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    // Verify product exists and check stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const availableStock = typeof product.stock === "number" ? product.stock : 0;
    if (availableStock <= 0) {
      return res.status(400).json({ message: "Product is out of stock" });
    }
    if (availableStock < Number(quantity)) {
      return res.status(400).json({ message: `Insufficient stock. Only ${availableStock} available.` });
    }

    // Find and update the cart item
    const cartItem = await Cart.findOne({ user: userId, product: productId });
    if (!cartItem) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    cartItem.quantity = Number(quantity);
    await cartItem.save();

    await cartItem.populate("product", "title price images brand stock");

    res.status(200).json(cartItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Remove Cart Item
const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;

    const cartItem = await Cart.findOne({ user: userId, product: productId });
    if (!cartItem) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    await Cart.findOneAndDelete({ user: userId, product: productId });
    res.status(200).json({ message: "Product removed from cart" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Clear Cart
const clearCart = async (req, res) => {
  try {
    const userId = req.user._id;
    await Cart.deleteMany({ user: userId });
    res.status(200).json({ message: "Cart cleared successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Cart (Protected)
const getCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const cartItems = await Cart.find({ user: userId })
      .populate("product", "title price images brand stock")
      .sort({ createdAt: -1 });

    res.status(200).json(cartItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Merge Guest Cart with User Cart
const mergeCart = async (req, res) => {
  try {
    const { items = [] } = req.body;
    const userId = req.user._id;

    for (const item of items) {
      const productId = item.productId || item.id;
      const quantity = item.quantity ? Number(item.quantity) : 1;

      if (!productId) continue;

      const product = await Product.findById(productId);
      if (!product) continue;

      const availableStock = typeof product.stock === "number" ? product.stock : 0;
      if (availableStock <= 0) continue; // Skip out-of-stock products during merge

      let cartItem = await Cart.findOne({ user: userId, product: productId });
      if (cartItem) {
        const newQuantity = Math.min(availableStock, cartItem.quantity + quantity);
        cartItem.quantity = newQuantity;
        await cartItem.save();
      } else {
        const newQuantity = Math.min(availableStock, quantity);
        if (newQuantity > 0) {
          await Cart.create({
            user: userId,
            product: productId,
            quantity: newQuantity,
          });
        }
      }
    }

    // Get final merged cart list
    const finalCartItems = await Cart.find({ user: userId })
      .populate("product", "title price images brand stock")
      .sort({ createdAt: -1 });

    res.status(200).json(finalCartItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  getCart,
  mergeCart,
};
