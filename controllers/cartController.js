const mongoose = require("mongoose");
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

    const {
      variantId,
      name,
      price,
      image,
      color,
      size,
      caseSize,
      strapSize,
      accessoriesSize,
      bandSize,
      connectivity,
      storage,
      ram,
      glass,
      processor,
      partNumber,
      appleCare,
      appleCarePlan,
      appleCareCost,
      appleCareSku,
    } = req.body;

    // Verify product exists and check stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Strictly validate stock
    const availableStock = typeof product.stock === "number" ? product.stock : 0;
    if (availableStock <= 0) {
      return res.status(400).json({ message: "Product is out of stock" });
    }
    if (quantity > availableStock) {
      return res.status(400).json({ message: `Insufficient stock. Only ${availableStock} available.` });
    }

    // Determine target variant ID
    const targetVariantId = variantId || `${productId}-${appleCare ? 'ac' : 'noac'}-${color || 'std'}-${storage || 'std'}`;

    // Check if matching variant is already in user's cart
    let cartItem = await Cart.findOne({ user: userId, variantId: targetVariantId });
    if (!cartItem && !variantId) {
      cartItem = await Cart.findOne({ user: userId, product: productId });
    }

    if (cartItem) {
      const newQuantity = cartItem.quantity + Number(quantity);
      if (newQuantity > availableStock) {
        return res.status(400).json({ message: `Insufficient stock. Cannot add. Only ${availableStock} available.` });
      }
      cartItem.quantity = newQuantity;
      if (appleCare !== undefined) cartItem.appleCare = Boolean(appleCare);
      if (appleCarePlan) cartItem.appleCarePlan = appleCarePlan;
      if (appleCareCost !== undefined) cartItem.appleCareCost = Number(appleCareCost);
      if (appleCareSku) cartItem.appleCareSku = appleCareSku;
      if (price !== undefined) cartItem.price = Number(price);
      await cartItem.save();
    } else {
      cartItem = await Cart.create({
        user: userId,
        product: productId,
        quantity: Number(quantity),
        variantId: targetVariantId,
        name: name || product.title || "",
        price: price !== undefined ? Number(price) : product.price,
        image: image || (product.images && product.images[0]) || product.image || "",
        color: color || "",
        size: size || "",
        caseSize: caseSize || "",
        strapSize: strapSize || "",
        accessoriesSize: accessoriesSize || "",
        bandSize: bandSize || "",
        connectivity: connectivity || "",
        storage: storage || "",
        ram: ram || "",
        glass: glass || "",
        processor: processor || "",
        partNumber: partNumber || "",
        appleCare: Boolean(appleCare),
        appleCarePlan: appleCarePlan || "",
        appleCareCost: Number(appleCareCost || 0),
        appleCareSku: appleCareSku || "",
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
    const rawTargetId = req.body.id || req.body.variantId || req.query.id || req.params.productId || "";
    const targetId = String(rawTargetId).trim();
    const quantity = req.body.quantity;
    const userId = req.user._id;

    if (quantity === undefined || Number(quantity) < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    if (!targetId) {
      return res.status(400).json({ message: "Cart item identifier is required" });
    }

    let decodedTargetId = targetId;
    try {
      decodedTargetId = decodeURIComponent(targetId);
    } catch (_) {}

    // Find cart item by variantId, _id, or product ref
    let cartItem = null;
    cartItem = await Cart.findOne({ user: userId, variantId: targetId });
    if (!cartItem && decodedTargetId !== targetId) {
      cartItem = await Cart.findOne({ user: userId, variantId: decodedTargetId });
    }
    if (!cartItem && mongoose.Types.ObjectId.isValid(targetId)) {
      cartItem = await Cart.findOne({ user: userId, _id: targetId });
    }
    if (!cartItem && mongoose.Types.ObjectId.isValid(targetId)) {
      cartItem = await Cart.findOne({ user: userId, product: targetId });
    }
    // Secondary fallback: match by base product ID prefix in variantId
    if (!cartItem && targetId.includes('-')) {
      const baseProdId = targetId.split('-')[0];
      if (mongoose.Types.ObjectId.isValid(baseProdId)) {
        cartItem = await Cart.findOne({ user: userId, product: baseProdId });
      }
    }

    if (!cartItem) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    // Verify product exists and check stock
    const product = await Product.findById(cartItem.product);
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
    const rawTargetId = req.body.id || req.body.variantId || req.query.id || req.params.productId || "";
    const targetId = String(rawTargetId).trim();
    const userId = req.user._id;

    if (!targetId) {
      return res.status(400).json({ message: "Cart item identifier is required" });
    }

    let decodedTargetId = targetId;
    try {
      decodedTargetId = decodeURIComponent(targetId);
    } catch (_) {}

    let deletedItem = null;
    deletedItem = await Cart.findOneAndDelete({ user: userId, variantId: targetId });
    if (!deletedItem && decodedTargetId !== targetId) {
      deletedItem = await Cart.findOneAndDelete({ user: userId, variantId: decodedTargetId });
    }
    if (!deletedItem && mongoose.Types.ObjectId.isValid(targetId)) {
      deletedItem = await Cart.findOneAndDelete({ user: userId, _id: targetId });
    }
    if (!deletedItem && mongoose.Types.ObjectId.isValid(targetId)) {
      deletedItem = await Cart.findOneAndDelete({ user: userId, product: targetId });
    }
    if (!deletedItem && targetId.includes('-')) {
      const baseProdId = targetId.split('-')[0];
      if (mongoose.Types.ObjectId.isValid(baseProdId)) {
        deletedItem = await Cart.findOneAndDelete({ user: userId, product: baseProdId });
      }
    }

    // Always succeed removal so client state remains clean
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
      const productId = item.productId || (item.id && item.id.split('-')[0]) || item.id;
      const quantity = item.quantity ? Number(item.quantity) : 1;

      if (!productId || !mongoose.Types.ObjectId.isValid(productId)) continue;

      const product = await Product.findById(productId);
      if (!product) continue;

      const availableStock = typeof product.stock === "number" ? product.stock : 0;
      if (availableStock <= 0) continue;

      const targetVariantId = item.id || item.variantId || `${productId}-${item.appleCare ? 'ac' : 'noac'}`;
      let cartItem = await Cart.findOne({ user: userId, variantId: targetVariantId });
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
            variantId: targetVariantId,
            name: item.name || product.title || "",
            price: item.price !== undefined ? Number(item.price) : product.price,
            image: item.image || (product.images && product.images[0]) || product.image || "",
            color: item.color || "",
            size: item.size || "",
            caseSize: item.caseSize || "",
            strapSize: item.strapSize || "",
            accessoriesSize: item.accessoriesSize || "",
            bandSize: item.bandSize || "",
            connectivity: item.connectivity || "",
            storage: item.storage || "",
            ram: item.ram || "",
            glass: item.glass || "",
            processor: item.processor || "",
            partNumber: item.partNumber || "",
            appleCare: Boolean(item.appleCare),
            appleCarePlan: item.appleCarePlan || "",
            appleCareCost: Number(item.appleCareCost || 0),
            appleCareSku: item.appleCareSku || "",
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
