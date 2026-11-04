const mongoose = require("mongoose");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Address = require("../models/Address");
const ReturnRequest = require("../models/ReturnRequest");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// Check if keys are active or mock placeholders
const isMockMode =
  !process.env.RAZORPAY_KEY_ID ||
  !process.env.RAZORPAY_KEY_SECRET ||
  process.env.RAZORPAY_KEY_ID === "rzp_test_placeholder" ||
  process.env.RAZORPAY_KEY_SECRET === "secret_placeholder";

class MockRazorpayOrders {
  async create(options) {
    console.log("[MOCK RAZORPAY] Creating order with options:", options);
    return {
      id: `order_mock_${Math.random().toString(36).substring(2, 11)}`,
      entity: "order",
      amount: options.amount,
      amount_paid: 0,
      amount_due: options.amount,
      currency: options.currency,
      receipt: options.receipt,
      offer_id: null,
      status: "created",
      attempts: 0,
      notes: [],
      created_at: Math.floor(Date.now() / 1000),
    };
  }
}

class MockRazorpay {
  constructor() {
    this.orders = new MockRazorpayOrders();
  }
}

let razorpay;
if (isMockMode) {
  razorpay = new MockRazorpay();
} else {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

/**
 * Authoritatively resolves product and price from database.
 * Never trusts client-supplied price.
 */
const resolveItemPriceAndStock = (productDoc, rawItem = {}) => {
  if (!productDoc) return { price: 0, availableStock: 0 };

  let matchedVariant = null;

  if (productDoc.variants && Array.isArray(productDoc.variants) && productDoc.variants.length > 0) {
    // 1. Match by variant ID/sku/partNumber if provided
    const targetVariantId = rawItem.variantId || rawItem.variant?._id || rawItem.variant;
    const targetSku = rawItem.sku || rawItem.partNumber;

    if (targetVariantId) {
      matchedVariant = productDoc.variants.find(
        (v) => v._id && v._id.toString() === targetVariantId.toString()
      );
    }

    if (!matchedVariant && targetSku) {
      matchedVariant = productDoc.variants.find(
        (v) => (v.sku && v.sku === targetSku) || (v.partNumber && v.partNumber === targetSku)
      );
    }

    // 2. Match by variant attributes: storage, color, size, ram, chip, etc.
    if (!matchedVariant && (rawItem.storage || rawItem.color || rawItem.size || rawItem.ram || rawItem.chip)) {
      matchedVariant = productDoc.variants.find((v) => {
        let match = true;
        if (rawItem.storage && v.storage) {
          match = match && (String(v.storage).trim().toLowerCase() === String(rawItem.storage).trim().toLowerCase());
        }
        if (rawItem.color && v.color) {
          match = match && (String(v.color).trim().toLowerCase() === String(rawItem.color).trim().toLowerCase());
        }
        if (rawItem.size && v.size) {
          match = match && (String(v.size).trim().toLowerCase() === String(rawItem.size).trim().toLowerCase());
        }
        if (rawItem.ram && v.ram) {
          match = match && (String(v.ram).trim().toLowerCase() === String(rawItem.ram).trim().toLowerCase());
        }
        if (rawItem.chip && v.chip) {
          match = match && (String(v.chip).trim().toLowerCase() === String(rawItem.chip).trim().toLowerCase());
        }
        return match;
      });
    }
  }

  let finalPrice = 0;
  let availableStock = typeof productDoc.stock === "number" ? productDoc.stock : 0;

  if (matchedVariant) {
    if (typeof matchedVariant.discountPrice === "number" && matchedVariant.discountPrice > 0) {
      finalPrice = matchedVariant.discountPrice;
    } else {
      finalPrice = Number(matchedVariant.price || 0);
    }
    if (typeof matchedVariant.stock === "number") {
      availableStock = matchedVariant.stock;
    }
  } else {
    if (typeof productDoc.discountPrice === "number" && productDoc.discountPrice > 0) {
      finalPrice = productDoc.discountPrice;
    } else {
      finalPrice = Number(productDoc.price || 0);
    }
  }

  return {
    price: Math.max(0, Number(finalPrice.toFixed(2))),
    availableStock,
    matchedVariant,
  };
};

// Create Order (Protected)
const createOrder = async (req, res) => {
  try {
    const { shippingAddress, paymentMethod, couponCode } = req.body;
    const userId = req.user._id;

    if (!shippingAddress || !paymentMethod) {
      return res.status(400).json({ message: "Shipping address and payment method are required" });
    }

    // Verify shipping address exists and belongs to the user
    const address = await Address.findOne({ _id: shippingAddress, user: userId });
    if (!address) {
      return res.status(400).json({ message: "Invalid shipping address" });
    }

    // Get user's cart items from DB or fallback to req.body.cartItems
    const cartItems = await Cart.find({ user: userId }).populate("product");
    const mongoose = require("mongoose");
    const resolvedItems = [];

    if (cartItems && cartItems.length > 0) {
      for (const item of cartItems) {
        if (!item.product) {
          return res.status(400).json({ message: "One of the products in your cart no longer exists" });
        }
        const { price, availableStock, matchedVariant } = resolveItemPriceAndStock(item.product, item);
        resolvedItems.push({
          product: item.product,
          quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
          price,
          availableStock,
          matchedVariant,
        });
      }
    } else if (req.body.cartItems && Array.isArray(req.body.cartItems) && req.body.cartItems.length > 0) {
      for (const rawItem of req.body.cartItems) {
        const prodId = rawItem.productId || (rawItem.id ? String(rawItem.id).split("-")[0] : (rawItem.product || rawItem._id));
        if (!prodId || !mongoose.Types.ObjectId.isValid(prodId)) {
          return res.status(400).json({ message: "Invalid product identifier provided in checkout" });
        }

        const productDoc = await Product.findById(prodId);
        if (!productDoc) {
          return res.status(400).json({ message: `Product "${rawItem.name || prodId}" no longer exists or is unavailable` });
        }

        const quantity = Math.max(1, parseInt(rawItem.quantity, 10) || 1);
        const { price, availableStock, matchedVariant } = resolveItemPriceAndStock(productDoc, rawItem);

        resolvedItems.push({
          product: productDoc,
          quantity,
          price, // Authoritatively resolved from DB; client price ignored
          availableStock,
          matchedVariant,
        });
      }
    }

    if (!resolvedItems || resolvedItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Validate product stock (strictly reject if stock <= 0 or stock < requested quantity)
    for (const item of resolvedItems) {
      const stock = typeof item.availableStock === "number" ? item.availableStock : 0;
      if (stock <= 0) {
        return res.status(400).json({
          message: `Product "${item.product.title}" is out of stock.`,
        });
      }
      if (stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for product: ${item.product.title}. Only ${stock} left.`,
        });
      }
    }

    let totalAmount = resolvedItems.reduce((acc, curr) => acc + curr.quantity * curr.price, 0);
    totalAmount = Number(totalAmount.toFixed(2));
    let appliedDiscount = 0;
    let appliedCoupon = "";

    // Apply Coupon if provided
    let matchedCouponDoc = null;
    if (couponCode) {
      const Coupon = require("../models/Coupon");
      const coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase() });
      if (coupon && new Date(coupon.expiryDate) >= new Date() && totalAmount >= (coupon.minimumAmount || 0)) {
        // Enforce total usage limit if configured
        const hasLimit = typeof coupon.usageLimit === "number" && coupon.usageLimit > 0;
        const limitReached = hasLimit && (coupon.usedCount || 0) >= coupon.usageLimit;

        // Enforce per-user limit if configured
        let perUserLimitReached = false;
        if (typeof coupon.perUserLimit === "number" && coupon.perUserLimit > 0) {
          const userOrdersCount = await Order.countDocuments({
            user: userId,
            couponCode: coupon.code,
            orderStatus: { $ne: "Cancelled" },
          });
          if (userOrdersCount >= coupon.perUserLimit) {
            perUserLimitReached = true;
          }
        }

        if (!limitReached && !perUserLimitReached) {
          const discountPct = Math.min(100, Math.max(0, Number(coupon.discount) || 0));
          appliedDiscount = Number(((totalAmount * discountPct) / 100).toFixed(2));

          // Cap at maxDiscountAmount if configured
          if (typeof coupon.maxDiscountAmount === "number" && coupon.maxDiscountAmount > 0) {
            appliedDiscount = Math.min(appliedDiscount, coupon.maxDiscountAmount);
          }

          appliedDiscount = Math.min(totalAmount, appliedDiscount);
          totalAmount = Number(Math.max(0, totalAmount - appliedDiscount).toFixed(2));
          appliedCoupon = coupon.code;
          matchedCouponDoc = coupon;
        }
      }
    }

    // Start MongoDB session for atomic inventory deduction and order creation
    const session = await mongoose.startSession();
    session.startTransaction();

    let createdOrder = null;
    try {
      // Atomically deduct stock using conditional queries
      for (const item of resolvedItems) {
        let updatedProduct = null;
        if (item.matchedVariant && item.matchedVariant._id) {
          updatedProduct = await Product.findOneAndUpdate(
            {
              _id: item.product._id,
              stock: { $gte: item.quantity },
              "variants._id": item.matchedVariant._id,
              "variants.stock": { $gte: item.quantity },
            },
            {
              $inc: {
                stock: -item.quantity,
                sold: item.quantity,
                "variants.$.stock": -item.quantity,
              },
            },
            { returnDocument: "after", session }
          );
        } else {
          updatedProduct = await Product.findOneAndUpdate(
            {
              _id: item.product._id,
              stock: { $gte: item.quantity },
            },
            {
              $inc: {
                stock: -item.quantity,
                sold: item.quantity,
              },
            },
            { returnDocument: "after", session }
          );
        }

        if (!updatedProduct) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            message: `Insufficient stock for product: ${item.product.title}. Only limited stock available.`,
          });
        }
      }

      // Map resolved items to order items with authoritative prices and variant tracking
      const orderItems = resolvedItems.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.price,
        variantId: item.matchedVariant ? item.matchedVariant._id : null,
        variant: item.matchedVariant
          ? {
              _id: item.matchedVariant._id,
              color: item.matchedVariant.color,
              storage: item.matchedVariant.storage,
              size: item.matchedVariant.size,
              sku: item.matchedVariant.sku,
            }
          : null,
      }));

      // Create the order inside transaction
      const [orderDoc] = await Order.create(
        [
          {
            user: userId,
            orderItems,
            shippingAddress,
            paymentMethod,
            paymentStatus: "Pending",
            orderStatus: "Pending",
            totalAmount,
            couponCode: appliedCoupon,
            discountAmount: appliedDiscount,
          },
        ],
        { session }
      );
      createdOrder = orderDoc;

      // Atomically increment coupon usedCount under concurrency check inside transaction
      if (matchedCouponDoc) {
        const Coupon = require("../models/Coupon");
        const couponFilter = {
          _id: matchedCouponDoc._id,
          expiryDate: { $gte: new Date() },
          $or: [
            { usageLimit: null },
            { usageLimit: { $exists: false } },
            { $expr: { $lt: ["$usedCount", "$usageLimit"] } },
          ],
        };
        const updatedCoupon = await Coupon.findOneAndUpdate(
          couponFilter,
          { $inc: { usedCount: 1 } },
          { session, returnDocument: "after" }
        );
        if (!updatedCoupon) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            message: "Coupon is no longer valid or total usage limit has been reached.",
          });
        }
      }

      // Create StockHistory logs inside transaction
      try {
        const StockHistory = require("../models/StockHistory");
        for (const item of resolvedItems) {
          await StockHistory.create(
            [
              {
                product: item.product._id,
                oldStock: item.availableStock,
                newStock: Math.max(0, item.availableStock - item.quantity),
                changeReason: `Order Placed (Order ID: #${createdOrder._id.toString().substring(0, 8).toUpperCase()})`,
                updatedBy: userId,
              },
            ],
            { session }
          );
        }
      } catch (historyErr) {
        console.error("Failed to write stock history logs:", historyErr);
      }

      // Clear user's cart inside transaction
      await Cart.deleteMany({ user: userId }, { session });

      await session.commitTransaction();
      session.endSession();
    } catch (txErr) {
      await session.abortTransaction();
      session.endSession();
      throw txErr;
    }

    const order = createdOrder;
    await order.populate([
      { path: "orderItems.product", select: "title price images brand" },
      { path: "shippingAddress" },
      { path: "user", select: "name email phone" },
    ]);

    const orderObj = order.toObject();

    if (paymentMethod === "COD") {
      try {
        const { sendOrderPlacedNotification } = require("../services/notificationService");
        await sendOrderPlacedNotification(order);
      } catch (notifyErr) {
        console.error("COD placed order notification failed:", notifyErr);
      }
    }

    if (paymentMethod === "Razorpay") {
      try {
        const razorpayOrder = await razorpay.orders.create({
          amount: Math.round(totalAmount * 100), // in paise
          currency: "INR",
          receipt: order._id.toString(),
        });

        order.razorpayOrderId = razorpayOrder.id;
        await order.save();

        orderObj.razorpayOrderId = razorpayOrder.id;
        orderObj.razorpayOrder = {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
        };
      } catch (err) {
        // Rollback stock deduction atomically
        for (const item of resolvedItems) {
          if (item.matchedVariant && item.matchedVariant._id) {
            await Product.findOneAndUpdate(
              { _id: item.product._id, "variants._id": item.matchedVariant._id },
              { $inc: { stock: item.quantity, sold: -item.quantity, "variants.$.stock": item.quantity } }
            );
          } else {
            await Product.findByIdAndUpdate(item.product._id, {
              $inc: { stock: item.quantity, sold: -item.quantity },
            });
          }
        }
        await Order.findByIdAndDelete(order._id);
        return res.status(500).json({ message: "Failed to create payment order: " + err.message });
      }
    }

    res.status(201).json(orderObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get User Orders (Protected)
const getOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const orders = await Order.find({ user: userId })
      .populate("orderItems.product", "title price images brand")
      .populate("shippingAddress")
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Track Order by ID (Protected)
const trackOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user._id;

    const order = await Order.findById(orderId)
      .populate("orderItems.product", "title price images brand")
      .populate("shippingAddress");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Verify ownership (unless user is admin)
    if (order.user.toString() !== userId.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to view this order" });
    }

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cancel Order (Protected)
const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order identifier" });
    }

    // Atomic conditional status transition to prevent duplicate cancellation & race conditions
    const query = {
      _id: orderId,
      orderStatus: { $in: ["Pending", "Processing"] },
    };
    if (req.user.role !== "admin") {
      query.user = userId;
    }

    const order = await Order.findOneAndUpdate(
      query,
      { $set: { orderStatus: "Cancelled" } },
      { returnDocument: "after" }
    );

    if (!order) {
      const existingOrder = await Order.findById(orderId);
      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (existingOrder.user.toString() !== userId.toString() && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to cancel this order" });
      }
      if (existingOrder.orderStatus === "Cancelled") {
        return res.status(400).json({ message: "Order is already cancelled" });
      }
      if (existingOrder.orderStatus === "Shipped" || existingOrder.orderStatus === "Delivered") {
        return res.status(400).json({ message: `Cannot cancel order after it has been ${existingOrder.orderStatus.toLowerCase()}` });
      }
      return res.status(400).json({ message: `Cannot cancel order with status: ${existingOrder.orderStatus}` });
    }

    // Restore product and variant stock exactly once
    const StockHistory = require("../models/StockHistory");
    for (const item of order.orderItems) {
      let restoredProduct = null;
      if (item.variantId) {
        restoredProduct = await Product.findOneAndUpdate(
          { _id: item.product, "variants._id": item.variantId },
          {
            $inc: {
              stock: item.quantity,
              sold: -item.quantity,
              "variants.$.stock": item.quantity,
            },
          },
          { returnDocument: "after" }
        );
      }
      if (!restoredProduct) {
        restoredProduct = await Product.findByIdAndUpdate(
          item.product,
          {
            $inc: {
              stock: item.quantity,
              sold: -item.quantity,
            },
          },
          { returnDocument: "after" }
        );
      }
      if (restoredProduct && restoredProduct.sold < 0) {
        await Product.findByIdAndUpdate(item.product, { $set: { sold: 0 } });
      }

      await StockHistory.create({
        product: item.product,
        oldStock: (restoredProduct?.stock || 0) - item.quantity,
        newStock: restoredProduct?.stock || 0,
        changeReason: `Order Cancelled by Customer (Order ID: #${order._id.toString().substring(0, 8).toUpperCase()})`,
        updatedBy: userId,
      });
    }

    // Restore coupon usedCount if order had a coupon applied
    if (order.couponCode) {
      try {
        const Coupon = require("../models/Coupon");
        await Coupon.findOneAndUpdate(
          { code: order.couponCode.toUpperCase(), usedCount: { $gt: 0 } },
          { $inc: { usedCount: -1 } }
        );
      } catch (couponRestoreErr) {
        console.error("Failed to restore coupon usage count on cancel:", couponRestoreErr.message);
      }
    }

    await order.populate([
      { path: "orderItems.product", select: "title price images brand" },
      { path: "shippingAddress" },
    ]);

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All System Orders (Admin only)
const adminGetOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate("user", "name email")
      .populate("orderItems.product", "title price images brand")
      .populate("shippingAddress")
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Order Status (Admin only)
const adminUpdateStatus = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized as an admin" });
    }

    const orderId = req.params.id;
    const { orderStatus } = req.body;

    const validStatuses = ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Return Requested", "Returned", "Refunded"];
    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const existingOrder = await Order.findById(orderId);
    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (existingOrder.orderStatus === "Cancelled" && orderStatus !== "Cancelled") {
      return res.status(400).json({ message: "Cannot revive a cancelled order" });
    }

    let order = existingOrder;

    // If changing to Cancelled from admin side, restore stock exactly once via atomic transition
    if (orderStatus === "Cancelled" && existingOrder.orderStatus !== "Cancelled") {
      const updatedOrder = await Order.findOneAndUpdate(
        {
          _id: orderId,
          orderStatus: { $nin: ["Cancelled", "Delivered", "Returned", "Refunded"] },
        },
        { $set: { orderStatus: "Cancelled" } },
        { returnDocument: "after" }
      );

      if (!updatedOrder) {
        return res.status(400).json({ message: "Cannot cancel an order that is already cancelled or delivered" });
      }

      const StockHistory = require("../models/StockHistory");
      for (const item of updatedOrder.orderItems) {
        let restoredProduct = null;
        if (item.variantId) {
          restoredProduct = await Product.findOneAndUpdate(
            { _id: item.product, "variants._id": item.variantId },
            {
              $inc: {
                stock: item.quantity,
                sold: -item.quantity,
                "variants.$.stock": item.quantity,
              },
            },
            { returnDocument: "after" }
          );
        }
        if (!restoredProduct) {
          restoredProduct = await Product.findByIdAndUpdate(
            item.product,
            {
              $inc: {
                stock: item.quantity,
                sold: -item.quantity,
              },
            },
            { returnDocument: "after" }
          );
        }
        if (restoredProduct && restoredProduct.sold < 0) {
          await Product.findByIdAndUpdate(item.product, { $set: { sold: 0 } });
        }

        await StockHistory.create({
          product: item.product,
          oldStock: (restoredProduct?.stock || 0) - item.quantity,
          newStock: restoredProduct?.stock || 0,
          changeReason: `Order Cancelled by Admin (Order ID: #${updatedOrder._id.toString().substring(0, 8).toUpperCase()})`,
          updatedBy: req.user._id,
        });
      }

      // Restore coupon usedCount if order had a coupon applied
      if (updatedOrder.couponCode) {
        try {
          const Coupon = require("../models/Coupon");
          await Coupon.findOneAndUpdate(
            { code: updatedOrder.couponCode.toUpperCase(), usedCount: { $gt: 0 } },
            { $inc: { usedCount: -1 } }
          );
        } catch (couponRestoreErr) {
          console.error("Failed to restore coupon usage count on admin cancel:", couponRestoreErr.message);
        }
      }

      order = updatedOrder;
    } else {
      const oldStatus = order.orderStatus;
      order.orderStatus = orderStatus;
      if (orderStatus === "Delivered") {
        order.paymentStatus = "Paid";
      }
      await order.save();

      // Send notifications if status changed to Shipped or Delivered
      if (oldStatus !== orderStatus) {
        try {
          const { sendOrderShippedNotification, sendOrderDeliveredNotification } = require("../services/notificationService");
          if (orderStatus === "Shipped") {
            await sendOrderShippedNotification(order);
          } else if (orderStatus === "Delivered") {
            await sendOrderDeliveredNotification(order);
          }
        } catch (notifyErr) {
          console.error("Order status update notification failed:", notifyErr);
        }
      }
    }

    await order.populate([
      { path: "orderItems.product", select: "title price images brand" },
      { path: "shippingAddress" },
      { path: "user", select: "name email phone" },
    ]);

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify Payment (Protected)
const verifyPayment = async (req, res) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user._id;

    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "All parameters are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: "Invalid order identifier" });
    }

    // Validate parameter string types
    if (
      typeof razorpay_order_id !== "string" ||
      typeof razorpay_payment_id !== "string" ||
      typeof razorpay_signature !== "string"
    ) {
      return res.status(400).json({ message: "Invalid parameter format" });
    }

    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // 1. Idempotency & Protection for Already-Paid Orders:
    // If order is already paid, return 200 OK idempotently for duplicate requests with matching payment ID,
    // and strictly prevent already-paid orders from being cancelled or marked unpaid.
    if (order.paymentStatus === "Paid") {
      if (order.razorpayPaymentId && order.razorpayPaymentId === razorpay_payment_id) {
        await order.populate([
          { path: "orderItems.product", select: "title price images brand" },
          { path: "shippingAddress" },
          { path: "user", select: "name email phone" },
        ]);
        return res.status(200).json({
          success: true,
          message: "Payment already verified",
          order,
        });
      }
      return res.status(400).json({
        success: false,
        message: "Order is already paid and cannot be modified or re-verified with different credentials",
      });
    }

    // 2. Prevent payment verification on already cancelled orders
    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot verify payment for a cancelled order",
      });
    }

    // 3. Verify razorpay_order_id matches order's stored identifier if set
    if (order.razorpayOrderId && order.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: "Razorpay order ID does not match this order",
      });
    }

    // 4. Prevent Payment Replay Attacks across different orders
    const replayOrder = await Order.findOne({
      razorpayPaymentId: razorpay_payment_id,
      _id: { $ne: order._id },
    });
    if (replayOrder) {
      return res.status(400).json({
        success: false,
        message: "Payment identifier has already been processed for another order",
      });
    }

    // 5. Secure signature verification using timing-safe comparison
    let isSignatureValid = false;

    if (isMockMode) {
      console.log("[MOCK RAZORPAY] Verifying mock signature...");
      isSignatureValid = typeof razorpay_signature === "string" && razorpay_signature.startsWith("mock_sig_");
    } else {
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

      const expectedBuffer = Buffer.from(expectedSignature, "utf8");
      const providedBuffer = Buffer.from(razorpay_signature, "utf8");

      if (expectedBuffer.length === providedBuffer.length) {
        isSignatureValid = crypto.timingSafeEqual(expectedBuffer, providedBuffer);
      } else {
        isSignatureValid = false;
      }
    }

    if (isSignatureValid) {
      // Atomically update order to Paid
      const paidOrder = await Order.findOneAndUpdate(
        {
          _id: order._id,
          paymentStatus: { $ne: "Paid" },
        },
        {
          $set: {
            paymentStatus: "Paid",
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
          },
        },
        { returnDocument: "after" }
      );

      const targetOrder = paidOrder || order;

      await targetOrder.populate([
        { path: "orderItems.product", select: "title price images brand" },
        { path: "shippingAddress" },
        { path: "user", select: "name email phone" },
      ]);

      if (paidOrder) {
        try {
          const { sendOrderPlacedNotification } = require("../services/notificationService");
          await sendOrderPlacedNotification(targetOrder);
        } catch (notifyErr) {
          console.error("Razorpay order placed notification failed:", notifyErr);
        }
      }

      res.status(200).json({ success: true, message: "Payment verified successfully", order: targetOrder });
    } else {
      // Payment verification failed: atomically cancel order & restore stock exactly once
      const failedOrder = await Order.findOneAndUpdate(
        {
          _id: order._id,
          paymentStatus: { $ne: "Paid" },
          orderStatus: { $nin: ["Cancelled", "Delivered", "Shipped"] },
        },
        {
          $set: {
            paymentStatus: "Failed",
            orderStatus: "Cancelled",
          },
        },
        { returnDocument: "after" }
      );

      if (failedOrder) {
        const StockHistory = require("../models/StockHistory");
        for (const item of failedOrder.orderItems) {
          let restoredProduct = null;
          if (item.variantId) {
            restoredProduct = await Product.findOneAndUpdate(
              { _id: item.product, "variants._id": item.variantId },
              {
                $inc: {
                  stock: item.quantity,
                  sold: -item.quantity,
                  "variants.$.stock": item.quantity,
                },
              },
              { returnDocument: "after" }
            );
          }
          if (!restoredProduct) {
            restoredProduct = await Product.findByIdAndUpdate(
              item.product,
              {
                $inc: {
                  stock: item.quantity,
                  sold: -item.quantity,
                },
              },
              { returnDocument: "after" }
            );
          }
          if (restoredProduct && restoredProduct.sold < 0) {
            await Product.findByIdAndUpdate(item.product, { $set: { sold: 0 } });
          }

          await StockHistory.create({
            product: item.product,
            oldStock: (restoredProduct?.stock || 0) - item.quantity,
            newStock: restoredProduct?.stock || 0,
            changeReason: `Payment Verification Failed/Aborted (Order ID: #${failedOrder._id.toString().substring(0, 8).toUpperCase()})`,
            updatedBy: userId,
          });
        }
      }

      res.status(400).json({ success: false, message: "Invalid payment signature" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Request Order Return (Protected, Customer)
const requestReturn = async (req, res) => {
  try {
    const { reason, comments } = req.body;
    const orderId = req.params.id;
    const userId = req.user._id;

    if (!reason) {
      return res.status(400).json({ message: "Reason for return is required" });
    }

    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.orderStatus !== "Delivered") {
      return res.status(400).json({ message: "Can only return delivered orders" });
    }

    order.orderStatus = "Return Requested";
    await order.save();

    await ReturnRequest.create({
      order: orderId,
      user: userId,
      reason,
      comments,
      status: "Pending"
    });

    await order.populate([
      { path: "orderItems.product", select: "title price images brand" },
      { path: "shippingAddress" },
    ]);

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Return Requests (Admin only)
const adminGetReturns = async (req, res) => {
  try {
    const returns = await ReturnRequest.find({})
      .populate("user", "name email")
      .populate({
        path: "order",
        populate: [
          { path: "orderItems.product", select: "title price images brand" },
          { path: "shippingAddress" }
        ]
      })
      .sort({ createdAt: -1 });
    res.status(200).json(returns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Return Request Status (Admin only)
const adminUpdateReturnStatus = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized as an admin" });
    }

    const { status } = req.body; // Approved, Rejected, Refunded
    const returnId = req.params.id;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const returnReq = await ReturnRequest.findById(returnId);
    if (!returnReq) {
      return res.status(404).json({ message: "Return request not found" });
    }

    const order = await Order.findById(returnReq.order);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    returnReq.status = status;
    await returnReq.save();

    if (status === "Approved") {
      order.orderStatus = "Returned";
      // Restore product stock and decrease sold counts
      const StockHistory = require("../models/StockHistory");
      for (const item of order.orderItems) {
        let restoredProduct = null;
        if (item.variantId) {
          restoredProduct = await Product.findOneAndUpdate(
            { _id: item.product, "variants._id": item.variantId },
            {
              $inc: {
                stock: item.quantity,
                sold: -item.quantity,
                "variants.$.stock": item.quantity,
              },
            },
            { returnDocument: "after" }
          );
        }
        if (!restoredProduct) {
          restoredProduct = await Product.findByIdAndUpdate(
            item.product,
            {
              $inc: { stock: item.quantity, sold: -item.quantity },
            },
            { returnDocument: "after" }
          );
        }
        if (restoredProduct && restoredProduct.sold < 0) {
          await Product.findByIdAndUpdate(item.product, { $set: { sold: 0 } });
        }
        
        await StockHistory.create({
          product: item.product,
          oldStock: (restoredProduct?.stock || 0) - item.quantity,
          newStock: restoredProduct?.stock || 0,
          changeReason: `Return Request Approved by Admin (Order ID: #${order._id.toString().substring(0, 8).toUpperCase()})`,
          updatedBy: req.user._id
        });
      }
    } else if (status === "Rejected") {
      order.orderStatus = "Delivered";
    } else if (status === "Refunded") {
      order.orderStatus = "Refunded";
      order.paymentStatus = "Failed";
    }

    await order.save();

    // Populate user and shipping details to dispatch notification
    try {
      await order.populate("user", "name email phone");
      const { sendReturnUpdateNotification } = require("../services/notificationService");
      await sendReturnUpdateNotification(order, returnReq);
    } catch (notifyErr) {
      console.error("Return update notification failed:", notifyErr);
    }

    res.status(200).json({ success: true, message: "Return request status updated successfully", returnReq });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Retrieve Sales Report Statistics (Admin only)
const adminGetSalesReport = async (req, res) => {
  try {
    const allOrders = await Order.find({ orderStatus: { $ne: "Cancelled" } })
      .populate("orderItems.product", "title brand price");

    let totalRevenue = 0;
    let totalDiscount = 0;
    let completedOrdersCount = 0;
    const productSales = {};
    const couponSales = {};
    const dailySalesMap = {};

    for (const order of allOrders) {
      const isPaid = order.paymentStatus === "Paid" || order.orderStatus === "Delivered" || order.orderStatus === "Shipped" || order.orderStatus === "Returned" || order.orderStatus === "Refunded";
      
      if (isPaid) {
        totalRevenue += order.totalAmount;
        totalDiscount += order.discountAmount || 0;
        completedOrdersCount++;

        // Track Daily Revenue (last 30 days)
        const dateStr = order.createdAt.toISOString().split("T")[0]; // YYYY-MM-DD
        dailySalesMap[dateStr] = (dailySalesMap[dateStr] || 0) + order.totalAmount;

        // Track Product Sales
        for (const item of order.orderItems) {
          if (item.product) {
            const prodId = item.product._id.toString();
            if (!productSales[prodId]) {
              productSales[prodId] = {
                title: item.product.title,
                brand: item.product.brand,
                unitsSold: 0,
                revenue: 0,
              };
            }
            productSales[prodId].unitsSold += item.quantity;
            productSales[prodId].revenue += item.price * item.quantity;
          }
        }

        // Track Coupon Usage
        if (order.couponCode) {
          const code = order.couponCode;
          if (!couponSales[code]) {
            couponSales[code] = {
              code,
              usageCount: 0,
              totalDiscount: 0,
            };
          }
          couponSales[code].usageCount++;
          couponSales[code].totalDiscount += order.discountAmount || 0;
        }
      }
    }

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 10);

    const couponUsage = Object.values(couponSales)
      .sort((a, b) => b.usageCount - a.usageCount);

    const dailyTrends = Object.entries(dailySalesMap).map(([date, amount]) => ({
      date,
      amount
    })).sort((a, b) => a.date.localeCompare(b.date));

    const aov = completedOrdersCount > 0 ? Number((totalRevenue / completedOrdersCount).toFixed(2)) : 0;

    res.status(200).json({
      netSales: totalRevenue,
      totalDiscount,
      ordersCount: completedOrdersCount,
      aov,
      topProducts,
      couponUsage,
      dailyTrends,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  getOrders,
  trackOrder,
  cancelOrder,
  adminGetOrders,
  adminUpdateStatus,
  verifyPayment,
  requestReturn,
  adminGetReturns,
  adminUpdateReturnStatus,
  adminGetSalesReport,
};
