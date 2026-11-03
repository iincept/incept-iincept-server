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
        const { price, availableStock } = resolveItemPriceAndStock(item.product, item);
        resolvedItems.push({
          product: item.product,
          quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
          price,
          availableStock,
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
        const { price, availableStock } = resolveItemPriceAndStock(productDoc, rawItem);

        resolvedItems.push({
          product: productDoc,
          quantity,
          price, // Authoritatively resolved from DB; client price ignored
          availableStock,
        });
      }
    }

    if (!resolvedItems || resolvedItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Validate product stock
    for (const item of resolvedItems) {
      if (typeof item.availableStock === "number" && item.availableStock > 0 && item.availableStock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for product: ${item.product.title}. Only ${item.availableStock} left.`,
        });
      }
    }

    // Deduct stock and increment sold count
    for (const item of resolvedItems) {
      const product = item.product;
      if (product && typeof product.save === "function") {
        if (typeof product.stock === "number") {
          product.stock = Math.max(0, product.stock - item.quantity);
        }
        product.sold = (product.sold || 0) + item.quantity;
        await product.save();
      }
    }

    // Map resolved items to order items with authoritative prices
    const orderItems = resolvedItems.map((item) => ({
      product: item.product._id,
      quantity: item.quantity,
      price: item.price,
    }));

    let totalAmount = resolvedItems.reduce((acc, curr) => acc + curr.quantity * curr.price, 0);
    totalAmount = Number(totalAmount.toFixed(2));
    let appliedDiscount = 0;
    let appliedCoupon = "";

    // Apply Coupon if provided
    if (couponCode) {
      const Coupon = require("../models/Coupon");
      const coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase() });
      if (coupon && new Date(coupon.expiryDate) >= new Date() && totalAmount >= coupon.minimumAmount) {
        appliedDiscount = Number(((totalAmount * coupon.discount) / 100).toFixed(2));
        totalAmount = Number(Math.max(0, totalAmount - appliedDiscount).toFixed(2));
        appliedCoupon = coupon.code;
      }
    }

    // Create the order
    const order = await Order.create({
      user: userId,
      orderItems,
      shippingAddress,
      paymentMethod,
      paymentStatus: "Pending",
      orderStatus: "Pending",
      totalAmount,
      couponCode: appliedCoupon,
      discountAmount: appliedDiscount,
    });

    // Create StockHistory logs
    try {
      const StockHistory = require("../models/StockHistory");
      for (const item of resolvedItems) {
        await StockHistory.create({
          product: item.product._id,
          oldStock: (item.product.stock || 0) + item.quantity,
          newStock: item.product.stock || 0,
          changeReason: `Order Placed (Order ID: #${order._id.toString().substring(0, 8).toUpperCase()})`,
          updatedBy: userId,
        });
      }
    } catch (historyErr) {
      console.error("Failed to write stock history logs:", historyErr);
    }

    // Clear user's cart
    await Cart.deleteMany({ user: userId });

    // Populate order details for return payload
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

        orderObj.razorpayOrder = {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
        };
      } catch (err) {
        // Rollback stock deduction
        for (const item of resolvedItems) {
          const product = item.product;
          if (product && typeof product.save === "function") {
            if (typeof product.stock === "number") {
              product.stock += item.quantity;
            }
            product.sold = Math.max(0, (product.sold || 0) - item.quantity);
            await product.save();
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

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Verify ownership (unless user is admin)
    if (order.user.toString() !== userId.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to cancel this order" });
    }

    // Can only cancel Pending or Processing orders
    if (order.orderStatus === "Shipped" || order.orderStatus === "Delivered") {
      return res.status(400).json({ message: `Cannot cancel order after it has been ${order.orderStatus.toLowerCase()}` });
    }

    if (order.orderStatus === "Cancelled") {
      return res.status(400).json({ message: "Order is already cancelled" });
    }

    // Restore product stock and decrement sold count
    const StockHistory = require("../models/StockHistory");
    for (const item of order.orderItems) {
      const product = await Product.findById(item.product);
      if (product) {
        const oldStock = product.stock;
        product.stock += item.quantity;
        product.sold = Math.max(0, product.sold - item.quantity);
        await product.save();
        
        await StockHistory.create({
          product: product._id,
          oldStock,
          newStock: product.stock,
          changeReason: `Order Cancelled by Customer (Order ID: #${order._id.toString().substring(0, 8).toUpperCase()})`,
          updatedBy: userId
        });
      }
    }

    order.orderStatus = "Cancelled";
    await order.save();

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

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.orderStatus === "Cancelled" && orderStatus !== "Cancelled") {
      return res.status(400).json({ message: "Cannot revive a cancelled order" });
    }

    // If changing to Cancelled from admin side, restore stock if not already cancelled
    if (orderStatus === "Cancelled" && order.orderStatus !== "Cancelled") {
      const StockHistory = require("../models/StockHistory");
      for (const item of order.orderItems) {
        const product = await Product.findById(item.product);
        if (product) {
          const oldStock = product.stock;
          product.stock += item.quantity;
          product.sold = Math.max(0, product.sold - item.quantity);
          await product.save();
          
          await StockHistory.create({
            product: product._id,
            oldStock,
            newStock: product.stock,
            changeReason: `Order Cancelled by Admin (Order ID: #${order._id.toString().substring(0, 8).toUpperCase()})`,
            updatedBy: req.user._id
          });
        }
      }
    }

    const oldStatus = order.orderStatus;
    order.orderStatus = orderStatus;
    if (orderStatus === "Delivered") {
      order.paymentStatus = "Paid";
    }

    await order.save();

    await order.populate([
      { path: "orderItems.product", select: "title price images brand" },
      { path: "shippingAddress" },
      { path: "user", select: "name email phone" }
    ]);

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

    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    let isSignatureValid = false;

    if (isMockMode) {
      console.log("[MOCK RAZORPAY] Verifying mock signature...");
      isSignatureValid = razorpay_signature.startsWith("mock_sig_");
    } else {
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

      isSignatureValid = expectedSignature === razorpay_signature;
    }

    if (isSignatureValid) {
      order.paymentStatus = "Paid";
      await order.save();

      await order.populate([
        { path: "orderItems.product", select: "title price images brand" },
        { path: "shippingAddress" },
        { path: "user", select: "name email phone" }
      ]);

      try {
        const { sendOrderPlacedNotification } = require("../services/notificationService");
        await sendOrderPlacedNotification(order);
      } catch (notifyErr) {
        console.error("Razorpay order placed notification failed:", notifyErr);
      }

      res.status(200).json({ success: true, message: "Payment verified successfully", order });
    } else {
      // Payment failed, restore stock and cancel order
      const StockHistory = require("../models/StockHistory");
      for (const item of order.orderItems) {
        const product = await Product.findById(item.product);
        if (product) {
          const oldStock = product.stock;
          product.stock += item.quantity;
          product.sold = Math.max(0, product.sold - item.quantity);
          await product.save();
          
          await StockHistory.create({
            product: product._id,
            oldStock,
            newStock: product.stock,
            changeReason: `Payment Verification Failed/Aborted (Order ID: #${order._id.toString().substring(0, 8).toUpperCase()})`,
            updatedBy: userId
          });
        }
      }

      order.paymentStatus = "Failed";
      order.orderStatus = "Cancelled";
      await order.save();

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
        const product = await Product.findById(item.product);
        if (product) {
          const oldStock = product.stock;
          product.stock += item.quantity;
          product.sold = Math.max(0, product.sold - item.quantity);
          await product.save();
          
          await StockHistory.create({
            product: product._id,
            oldStock,
            newStock: product.stock,
            changeReason: `Return Request Approved by Admin (Order ID: #${order._id.toString().substring(0, 8).toUpperCase()})`,
            updatedBy: req.user._id
          });
        }
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
