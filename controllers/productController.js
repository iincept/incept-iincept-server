const Product = require("../models/Product");
const Category = require("../models/Category");
const XLSX = require("xlsx");
const { resolveColorHex, isValidHex, normalizeHex } = require("../utils/colorResolver");

const sanitizeVariants = (variants) => {
  if (!Array.isArray(variants)) return [];
  const mongoose = require("mongoose");
  return variants.map((v) => {
    if (!v || typeof v !== "object") return v;
    const vObj = v.toObject ? v.toObject() : { ...v };
    let hex = vObj.colorHex;
    if (hex && isValidHex(hex)) {
      hex = normalizeHex(hex);
    } else if (vObj.color) {
      hex = resolveColorHex(vObj.color);
    } else {
      hex = "";
    }

    // Clean up _id if it's not a valid MongoDB ObjectId so Mongoose generates one
    if (vObj._id && !mongoose.Types.ObjectId.isValid(vObj._id)) {
      delete vObj._id;
    }

    const priceNum = vObj.price !== undefined && vObj.price !== "" ? Number(vObj.price) : 0;
    const stockNum = vObj.stock !== undefined && vObj.stock !== "" ? Number(vObj.stock) : 0;
    const discPriceNum = (vObj.discountPrice !== undefined && vObj.discountPrice !== "" && Number(vObj.discountPrice) >= 0) ? Number(vObj.discountPrice) : 0;
    const discPctNum = (vObj.discountPercent !== undefined && vObj.discountPercent !== "" && Number(vObj.discountPercent) >= 0) ? Number(vObj.discountPercent) : 0;
    const discNum = (vObj.discount !== undefined && vObj.discount !== "" && Number(vObj.discount) >= 0) ? Number(vObj.discount) : 0;

    return {
      ...vObj,
      colorHex: hex,
      price: !isNaN(priceNum) ? priceNum : 0,
      stock: !isNaN(stockNum) ? stockNum : 0,
      discountPrice: !isNaN(discPriceNum) ? discPriceNum : 0,
      discountPercent: !isNaN(discPctNum) ? discPctNum : 0,
      discount: !isNaN(discNum) ? discNum : 0,
    };
  });
};

const sanitizeColors = (colors, sanitizedVariants = []) => {
  if (!Array.isArray(colors)) return [];
  return colors.map((c) => {
    if (typeof c === "string") {
      const matched = sanitizedVariants.find(
        (v) => (v.color || "").trim().toLowerCase() === c.trim().toLowerCase()
      );
      const hex = matched?.colorHex || resolveColorHex(c);
      return {
        name: c,
        value: hex,
        colorHex: hex,
      };
    }
    if (c && typeof c === "object") {
      const name = c.name || c.color || "";
      const hex =
        c.colorHex && isValidHex(c.colorHex)
          ? normalizeHex(c.colorHex)
          : c.value && isValidHex(c.value)
          ? normalizeHex(c.value)
          : resolveColorHex(name);
      return {
        ...c,
        name,
        value: hex,
        colorHex: hex,
      };
    }
    return c;
  });
};

const attachFallbackColorHex = (product) => {
  if (!product) return product;
  const p = product.toObject ? product.toObject() : { ...product };
  if (p.variants && Array.isArray(p.variants)) {
    p.variants = p.variants.map((v) => {
      const vObj = v && v.toObject ? v.toObject() : { ...v };
      if (vObj && vObj.color && (!vObj.colorHex || !isValidHex(vObj.colorHex))) {
        return { ...vObj, colorHex: resolveColorHex(vObj.color) };
      }
      return vObj;
    });
  }
  if (p.colors && Array.isArray(p.colors)) {
    p.colors = p.colors.map((c) => {
      if (typeof c === "string") {
        const hex = resolveColorHex(c);
        return { name: c, value: hex, colorHex: hex };
      }
      if (c && typeof c === "object") {
        const hex =
          c.colorHex && isValidHex(c.colorHex)
            ? normalizeHex(c.colorHex)
            : c.value && isValidHex(c.value)
            ? normalizeHex(c.value)
            : resolveColorHex(c.name || "");
        return { ...c, value: hex, colorHex: hex };
      }
      return c;
    });
  }
  return p;
};

// Helper to generate unique slugs
const slugify = (text) => {
  return (text || "")
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
};

const generateUniqueSlug = async (title, currentProductId = null) => {
  let baseSlug = slugify(title) || "product";
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug };
    if (currentProductId) {
      query._id = { $ne: currentProductId };
    }
    const existing = await Product.findOne(query);
    if (!existing) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
};

// Add Product (Admin only)
const createProduct = async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      discountPrice,
      discountPercent,
      discount,
      images,
      category,
      brand,
      stock,
      sizes,
      accessoriesSizes,
      bandSizes,
      strapSizes,
      connectivities,
      glasses,
      processors,
      colors,
      storage,
      ram,
      material,
      features,
      rating,
      variants,
      partNumber,
      modelNumber,
      displayImage,
      colorImages,
    } = req.body;

    // Validate category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ message: "Category does not exist" });
    }

    const slug = await generateUniqueSlug(title);

    if (Array.isArray(variants)) {
      for (const [idx, v] of variants.entries()) {
        if (!v || typeof v !== "object") continue;
        if (v.price !== undefined && v.price !== "" && Number(v.price) < 0) {
          return res.status(400).json({ message: `Variant #${idx + 1} price cannot be negative.` });
        }
        if (v.stock !== undefined && v.stock !== "" && Number(v.stock) < 0) {
          return res.status(400).json({ message: `Variant #${idx + 1} stock cannot be negative.` });
        }
        if (v.discountPrice !== undefined && v.discountPrice !== "" && Number(v.discountPrice) < 0) {
          return res.status(400).json({ message: `Variant #${idx + 1} discount price cannot be negative.` });
        }
      }
    }

    const processedVariants = sanitizeVariants(variants);
    const processedColors = sanitizeColors(colors, processedVariants);

    let finalPrice = Number(price);
    if ((isNaN(finalPrice) || finalPrice <= 0) && processedVariants.length > 0) {
      const validV = processedVariants.map(v => Number(v.price)).filter(p => !isNaN(p) && p > 0);
      if (validV.length > 0) finalPrice = Math.min(...validV);
    }
    if (isNaN(finalPrice)) finalPrice = 0;

    let finalStock = Number(stock);
    if ((isNaN(finalStock) || finalStock <= 0) && processedVariants.length > 0) {
      finalStock = processedVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    }
    if (isNaN(finalStock)) finalStock = 0;

    const finalDisplayImage = displayImage || (processedVariants[0]?.images?.[0]) || (images?.[0]) || "";

    const product = await Product.create({
      title,
      slug,
      description,
      price: finalPrice,
      discountPrice: discountPrice || 0,
      discountPercent: discountPercent || 0,
      discount: discount || 0,
      images: images && images.length > 0 ? images : (finalDisplayImage ? [finalDisplayImage] : []),
      category,
      brand,
      stock: finalStock,
      sizes: sizes || [],
      accessoriesSizes: accessoriesSizes || [],
      bandSizes: bandSizes || [],
      strapSizes: strapSizes || [],
      connectivities: connectivities || [],
      glasses: glasses || [],
      processors: processors || [],
      colors: processedColors,
      storage: storage || [],
      ram: ram || [],
      material: material || [],
      features: features || [],
      rating,
      variants: processedVariants,
      partNumber: partNumber || "",
      modelNumber: modelNumber || "",
      displayImage: finalDisplayImage,
      colorImages: colorImages || {},
      seoTitle: req.body.seoTitle || "",
      seoDescription: req.body.seoDescription || "",
      tags: req.body.tags || [],
    });

    res.status(201).json(product);
  } catch (error) {
    if (error.code === 11000) {
      try {
        const fallbackSlug = `${slugify(req.body.title || 'product')}-${Date.now().toString().slice(-4)}`;
        const product = await Product.create({
          ...req.body,
          slug: fallbackSlug
        });
        return res.status(201).json(product);
      } catch (retryError) {
        return res.status(400).json({ message: "Duplicate product title/slug. Please use a unique title." });
      }
    }
    if (error.name === "ValidationError") {
      const msg = Object.values(error.errors || {}).map(e => e.message).join(", ") || error.message;
      return res.status(400).json({ message: msg, errors: error.errors });
    }
    res.status(500).json({ message: error.message });
  }
};

// Update Product (Admin only)
const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const {
      title,
      description,
      price,
      discountPrice,
      discountPercent,
      discount,
      images,
      category,
      brand,
      stock,
      sizes,
      accessoriesSizes,
      bandSizes,
      strapSizes,
      connectivities,
      glasses,
      processors,
      colors,
      storage,
      ram,
      material,
      features,
      rating,
      variants,
      partNumber,
      modelNumber,
      displayImage,
      colorImages,
    } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // If category is changing, validate it exists
    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({ message: "Category does not exist" });
      }
      product.category = category;
    }

    if (title) {
      product.title = title;
      product.slug = await generateUniqueSlug(title, productId);
    }
    if (description !== undefined) product.description = description;
    if (images) product.images = images;
    if (brand) product.brand = brand;
    const oldStock = product.stock;
    const isStockChanged = stock !== undefined && Number(stock) !== oldStock;

    if (stock !== undefined) product.stock = Number(stock);
    if (sizes) product.sizes = sizes;
    if (accessoriesSizes) product.accessoriesSizes = accessoriesSizes;
    if (bandSizes) product.bandSizes = bandSizes;
    if (strapSizes) product.strapSizes = strapSizes;
    if (connectivities) product.connectivities = connectivities;
    if (glasses) product.glasses = glasses;
    if (processors) product.processors = processors;
    if (variants !== undefined && Array.isArray(variants)) {
      for (const [idx, v] of variants.entries()) {
        if (!v || typeof v !== "object") continue;
        if (v.price !== undefined && v.price !== "" && Number(v.price) < 0) {
          return res.status(400).json({ message: `Variant #${idx + 1} price cannot be negative.` });
        }
        if (v.stock !== undefined && v.stock !== "" && Number(v.stock) < 0) {
          return res.status(400).json({ message: `Variant #${idx + 1} stock cannot be negative.` });
        }
        if (v.discountPrice !== undefined && v.discountPrice !== "" && Number(v.discountPrice) < 0) {
          return res.status(400).json({ message: `Variant #${idx + 1} discount price cannot be negative.` });
        }
      }
    }

    if (variants !== undefined) product.variants = sanitizeVariants(variants);
    if (colors !== undefined) product.colors = sanitizeColors(colors, product.variants || []);
    if (partNumber !== undefined) product.partNumber = partNumber;
    if (modelNumber !== undefined) product.modelNumber = modelNumber;
    if (displayImage !== undefined) product.displayImage = displayImage;
    if (colorImages !== undefined) product.colorImages = colorImages;
    if (storage !== undefined) product.storage = storage;
    if (ram !== undefined) product.ram = ram;
    if (material !== undefined) product.material = material;
    if (features !== undefined) product.features = features;
    if (rating !== undefined) product.rating = rating;
    if (req.body.seoTitle !== undefined) product.seoTitle = req.body.seoTitle;
    if (req.body.seoDescription !== undefined) product.seoDescription = req.body.seoDescription;
    if (req.body.tags !== undefined) product.tags = req.body.tags;

    const isRemovingDiscount = discountPrice === 0 || discountPrice === "0" || discountPrice === null || (req.body.hasOwnProperty('discountPrice') && req.body.discountPrice === "");

    // Auto-sync parent product price & discountPrice with lowest variant price if variants exist
    if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
      const validVariantPrices = product.variants.map(v => Number(v.price)).filter(p => !isNaN(p) && p > 0);
      // Only count variant discountPrice as a real discount if strictly less than the variant's own price
      const validVariantDiscPrices = product.variants
        .filter(v => Number(v.discountPrice) > 0 && Number(v.discountPrice) < Number(v.price))
        .map(v => Number(v.discountPrice));

      if (validVariantPrices.length > 0) {
        product.price = Math.min(...validVariantPrices);
      } else if (price !== undefined) {
        product.price = price;
      }

      if (validVariantDiscPrices.length > 0) {
        product.discountPrice = Math.min(...validVariantDiscPrices);
      } else if (isRemovingDiscount) {
        product.discountPrice = 0;
        product.discountPercent = 0;
      } else if (discountPrice !== undefined) {
        product.discountPrice = discountPrice;
      }
    } else {
      if (price !== undefined) product.price = price;
      if (isRemovingDiscount) {
        product.discountPrice = 0;
        product.discountPercent = 0;
      } else if (discountPrice !== undefined) {
        product.discountPrice = discountPrice;
      }
    }

    const updatedProduct = await product.save();

    if (isStockChanged) {
      try {
        const StockHistory = require("../models/StockHistory");
        await StockHistory.create({
          product: productId,
          oldStock,
          newStock: updatedProduct.stock,
          changeReason: "Restocked by Admin",
          updatedBy: req.user._id
        });
      } catch (historyErr) {
        console.error("Failed to log product stock change:", historyErr);
      }
    }

    res.status(200).json(updatedProduct);
  } catch (error) {
    if (error.name === "ValidationError") {
      const msg = Object.values(error.errors || {}).map(e => e.message).join(", ") || error.message;
      return res.status(400).json({ message: msg, errors: error.errors });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: "Duplicate product title/slug. Please use a unique title." });
    }
    res.status(500).json({ message: error.message });
  }
};

// Delete Product (Admin only)
const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await Product.findByIdAndDelete(productId);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Products (Public)
const getProducts = async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, sortBy, order } = req.query;
    let query = {};

    // 1. Search Filter (title, description, brand, sku, partNumber, modelNumber, variants)
    if (search) {
      const cleanSearch = search.trim();
      const normSearch = cleanSearch.replace(/^i(?=[a-z])/i, '');
      const searchRegex = { $regex: cleanSearch, $options: "i" };
      const normRegex = { $regex: normSearch, $options: "i" };
      query.$or = [
        { title: searchRegex },
        { title: normRegex },
        { description: searchRegex },
        { brand: searchRegex },
        { sku: searchRegex },
        { partNumber: searchRegex },
        { modelNumber: searchRegex },
        { "variants.sku": searchRegex },
        { "variants.partNumber": searchRegex },
        { "variants.modelNumber": searchRegex },
        { "variants.title": searchRegex },
        { "variants.displayTitle": searchRegex },
      ];
    }

    // 2. Category Filter (slug or ObjectId)
    if (category) {
      const categoryDoc = await Category.findOne({ slug: category });
      if (categoryDoc) {
        query.category = categoryDoc._id;
      } else {
        const mongoose = require("mongoose");
        if (mongoose.Types.ObjectId.isValid(category)) {
          query.category = category;
        } else {
          // If category filter is invalid, return empty list
          return res.status(200).json([]);
        }
      }
    }

    // 3. Price Filter (minPrice/maxPrice)
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) {
        query.price.$gte = Number(minPrice);
      }
      if (maxPrice) {
        query.price.$lte = Number(maxPrice);
      }
    }

    // 4. Sorting
    let sort = {};
    if (sortBy) {
      const sortOrder = order === "asc" ? 1 : -1;
      sort[sortBy] = sortOrder;
    } else {
      sort.createdAt = -1; // Default
    }

    const products = await Product.find(query)
      .populate("category", "name slug")
      .sort(sort);

    const formatted = products.map((p) => attachFallbackColorHex(p));
    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Single Product by ID (Public)
const getProductById = async (req, res) => {
  try {
    const productId = req.params.id;
    const mongoose = require("mongoose");
    let product;

    if (mongoose.Types.ObjectId.isValid(productId)) {
      product = await Product.findById(productId).populate("category", "name slug");
    } else {
      // Mock ID map to standard database product titles
      const mockIdMap = {
        'ip17pm': 'iPhone 17 Pro Max',
        'ip17p': 'iPhone 17 Pro',
        'ipair': 'iPhone Air',
        'ip17': 'iPhone 17',
        'ip16pm': 'iPhone 17e',
        'ip16p': 'iPhone 16 Pro',
        'ip16plus': 'iPhone 16 Plus',
        'ip16': 'iPhone 16',
        'ip15pm': 'iPhone 15 Pro Max',
        'ip15p': 'iPhone 15 Pro',
        'ip15': 'iPhone 15',
        'mbneo': 'MacBook Neo 14-inch',
        'mbp16m4': 'MacBook Pro 16-inch (M4 Max)',
        'mbp14m4': 'MacBook Pro 14-inch (M4 Pro)',
        'mba15m3': 'MacBook Air 15-inch (M3)',
        'mba13m3': 'MacBook Air 13-inch (M3)',
        'mbp16m3': 'MacBook Pro 16-inch (M3 Max)',
        'mbp14m3': 'MacBook Pro 14-inch (M3 Pro)',
        'mba13m2': 'MacBook Air 13-inch (M2)',
        'mbp13m2': 'MacBook Pro 13-inch (M2)',
        'ipadpro13m4': 'iPad Pro 13-inch (M4)',
        'ipadpro11m4': 'iPad Pro 11-inch (M4)',
        'ipadair13m4': 'iPad Air 13-inch (M4)',
        'ipadair11m4': 'iPad Air 11-inch (M4)',
        'ipad10th': 'iPad 10.9-inch (10th Gen)',
        'ipadminia17': 'iPad mini (A17 Pro)',
        'ipadpro12m2': 'iPad Pro 12.9-inch (M2)',
        'awultra2': 'Apple Watch Ultra 2',
        'awseries10': 'Apple Watch Series 10',
        'awse': 'Apple Watch SE',
        'awhermes10': 'Apple Watch Hermès Series 10',
        'apmaxusbc': 'AirPods Max (USB-C)',
        'appro2': 'AirPods Pro 2',
        'ap4anc': 'AirPods 4 (with ANC)',
        'ap4': 'AirPods 4',
        'apmaxlightning': 'AirPods Max (Lightning)',
        'appletv4k': 'Apple TV 4K',
        'homepod2': 'HomePod (2nd Gen)',
        'homepodmini': 'HomePod mini',
        'homepod1': 'HomePod (1st Gen)',
        'belkin3in1': 'Belkin UltraCharge Pro 3-in-1 Magnetic Charging Dock',
        'herschelsling': 'Herschel Cloud Sling for iPhone',
        'herscheltote': 'Herschel AirPods Tote Bag Charm'
      };

      const title = mockIdMap[productId];
      if (title) {
        product = await Product.findOne({ title }).populate("category", "name slug");
      }
      
      if (!product) {
        // Fallback: try searching case-insensitively by title using slugified mock ID
        const slug = productId.replace(/[_-]/g, ' ');
        product = await Product.findOne({ title: { $regex: new RegExp(slug, 'i') } }).populate("category", "name slug");
      }
    }

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json(attachFallbackColorHex(product));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Stock History (Admin only)
const adminGetStockHistory = async (req, res) => {
  try {
    const StockHistory = require("../models/StockHistory");
    const logs = await StockHistory.find({})
      .populate("product", "title price brand images")
      .populate("updatedBy", "name email")
      .sort({ createdAt: -1 });
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Category matching helper
const getCategoryIdsByKey = async (key) => {
  if (!key || key === 'all') return null;
  const k = key.toLowerCase().trim();
  let query = {};
  if (k === 'mac' || k === 'macbook' || k === 'laptops-pcs') {
    query = { $or: [{ slug: /mac|laptops/i }, { name: /mac|laptops/i }] };
  } else if (k === 'ipad' || k === 'ipads') {
    query = { $or: [{ slug: /ipad/i }, { name: /ipad/i }] };
  } else if (k === 'iphone' || k === 'smartphones') {
    query = { $or: [{ slug: /iphone|smartphone/i }, { name: /iphone|smartphone/i }] };
  } else if (k === 'watch' || k === 'wearables') {
    query = { $or: [{ slug: /watch|wearable/i }, { name: /watch|wearable/i }] };
  } else if (k === 'airpods' || k === 'premium-audio') {
    query = { $or: [{ slug: /airpod|audio/i }, { name: /airpod|audio/i }] };
  } else if (k === 'accessories') {
    query = { $or: [{ slug: /accessor/i }, { name: /accessor/i }] };
  } else if (k === 'tv-home' || k === 'tv') {
    query = { $or: [{ slug: /tv|home/i }, { name: /tv|home/i }] };
  } else {
    query = { $or: [{ slug: new RegExp(k, 'i') }, { name: new RegExp(k, 'i') }] };
  }
  const cats = await Category.find(query);
  return cats.map(c => c._id);
};

const getCategoryDocByKey = async (key) => {
  if (!key || key === 'all') key = 'mac';
  const catIds = await getCategoryIdsByKey(key);
  if (catIds && catIds.length > 0) {
    return await Category.findById(catIds[0]);
  }
  const nameMap = {
    mac: 'Laptops & PCs',
    ipad: 'iPads',
    iphone: 'Smartphones',
    watch: 'Wearables',
    airpods: 'AirPods',
    accessories: 'Accessories',
    'tv-home': 'TV & Home'
  };
  const catName = nameMap[key] || key.charAt(0).toUpperCase() + key.slice(1);
  const catSlug = slugify(catName);
  let cat = await Category.findOne({ slug: catSlug });
  if (!cat) {
    cat = await Category.create({ name: catName, slug: catSlug, image: '/category_placeholder.png' });
  }
  return cat;
};

// Export Products to Excel per Category
const exportProductsExcel = async (req, res) => {
  try {
    const { category = "all" } = req.query;
    let query = {};
    const catIds = await getCategoryIdsByKey(category);
    if (catIds && catIds.length > 0) {
      query.category = { $in: catIds };
    }

    const products = await Product.find(query).populate("category", "name slug").lean();

    const rows = [];
    products.forEach((p) => {
      const catName = p.category ? p.category.name : category;
      if (p.variants && p.variants.length > 0) {
        p.variants.forEach((v) => {
          const mrp = Number(v.price || p.price || 0);
          const discPrice = Number(v.discountPrice ?? p.discountPrice ?? mrp);
          const discountPercent = mrp > 0 ? Math.round(((mrp - discPrice) / mrp) * 100) : 0;
          const imgList = (v.images && v.images.length > 0 ? v.images : p.images || []).join(", ");

          rows.push({
            Title: p.title,
            "Part Number": v.partNumber || p.partNumber || "",
            Color: v.color || "",
            RAM: v.ram || "",
            Storage: v.storage || "",
            "MRP (Price)": mrp,
            "Discount %": discountPercent >= 0 ? discountPercent : 0,
            "Final Price": discPrice,
            Stock: Number(v.stock ?? p.stock ?? 0),
            Category: catName,
            "Variant Title": v.title || v.displayTitle || "",
            "Size / Case Size": v.size || "",
            "Chip / Processor": v.chip || v.processor || "",
            SKU: v.sku || p.sku || "",
            "Model Number": v.modelNumber || p.modelNumber || "",
            Brand: p.brand || "Apple",
            Description: p.description || "",
            Images: imgList,
          });
        });
      } else {
        const mrp = Number(p.price || 0);
        const discPrice = Number(p.discountPrice ?? mrp);
        const discountPercent = mrp > 0 ? Math.round(((mrp - discPrice) / mrp) * 100) : 0;
        const imgList = (p.images || []).join(", ");

        rows.push({
          Title: p.title,
          "Part Number": p.partNumber || "",
          Color: Array.isArray(p.colors) ? p.colors.join(", ") : "",
          RAM: Array.isArray(p.ram) ? p.ram.join(", ") : "",
          Storage: Array.isArray(p.storage) ? p.storage.join(", ") : "",
          "MRP (Price)": mrp,
          "Discount %": discountPercent >= 0 ? discountPercent : 0,
          "Final Price": discPrice,
          Stock: Number(p.stock || 0),
          Category: catName,
          "Variant Title": "",
          "Size / Case Size": Array.isArray(p.sizes) ? p.sizes.join(", ") : "",
          "Chip / Processor": Array.isArray(p.processors) ? p.processors.join(", ") : "",
          SKU: p.sku || "",
          "Model Number": p.modelNumber || "",
          Brand: p.brand || "Apple",
          Description: p.description || "",
          Images: imgList,
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(
      rows.length > 0
        ? rows
        : [
            {
              Title: "Sample Product Title",
              "Part Number": "MXNA3HN/A",
              Color: "Space Grey",
              RAM: "8GB",
              Storage: "256GB",
              "MRP (Price)": 59900,
              "Discount %": 10,
              "Final Price": 53910,
              Stock: 25,
              Category: category,
              "Variant Title": "Space Grey / 8GB / 256GB",
              "Size / Case Size": "8.3-inch",
              "Chip / Processor": "A17 Pro",
              SKU: "SKU123",
              "Model Number": "A2992",
              Brand: "Apple",
              Description: "Sample Apple Product description",
              Images: "/sample_image.png",
            },
          ]
    );

    const workbook = XLSX.utils.book_new();
    const sheetName = category.toUpperCase().slice(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${category.toLowerCase()}_products.xlsx"`
    );
    return res.send(buffer);
  } catch (error) {
    console.error("Export Excel error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Preview Products from Excel upload
const previewImportProductsExcel = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "No Excel file uploaded" });
    }
    const { category = "all" } = req.query;
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!rawRows || rawRows.length === 0) {
      return res.status(400).json({ message: "Excel sheet is empty" });
    }

    const grouped = {};
    rawRows.forEach((r) => {
      const parentTitle = (
        r["Title"] ||
        r["Parent Title"] ||
        r["Product Title"] ||
        r["Name"] ||
        ""
      )
        .toString()
        .trim();
      if (!parentTitle) return;
      if (!grouped[parentTitle]) {
        grouped[parentTitle] = {
          title: parentTitle,
          category: r["Category"] || category,
          brand: r["Brand"] || "Apple",
          rows: [],
        };
      }
      grouped[parentTitle].rows.push(r);
    });

    const productsPreview = Object.values(grouped).map((g) => ({
      title: g.title,
      category: g.category,
      brand: g.brand,
      variantCount: g.rows.length,
      samplePartNumber:
        g.rows[0]["Part Number"] ||
        g.rows[0]["Part Number (MPN)"] ||
        g.rows[0]["Part No"] ||
        g.rows[0]["MPN"] ||
        g.rows[0]["SKU"] ||
        "",
      mrpRange: g.rows.map((r) =>
        Number(r["MRP (Price)"] || r["MRP"] || r["Price"] || 0)
      ),
    }));

    res.status(200).json({
      totalRows: rawRows.length,
      totalProducts: productsPreview.length,
      products: productsPreview,
      categoryKey: category,
    });
  } catch (error) {
    console.error("Preview Excel error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Import / Bulk Save Products from Excel per Category
const importProductsExcel = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "No Excel file uploaded" });
    }
    const { category = "all" } = req.query;
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!rawRows || rawRows.length === 0) {
      return res.status(400).json({ message: "Excel sheet is empty" });
    }

    const defaultCatDoc = await getCategoryDocByKey(category);

    const grouped = {};
    rawRows.forEach((r) => {
      const parentTitle = (
        r["Title"] ||
        r["Parent Title"] ||
        r["Product Title"] ||
        r["Name"] ||
        ""
      )
        .toString()
        .trim();
      if (!parentTitle) return;
      if (!grouped[parentTitle]) {
        grouped[parentTitle] = {
          title: parentTitle,
          categoryName: r["Category"] || "",
          brand: (r["Brand"] || "Apple").toString().trim(),
          description: (r["Description"] || "").toString().trim(),
          rows: [],
        };
      }
      grouped[parentTitle].rows.push(r);
    });

    let createdCount = 0;
    let updatedCount = 0;

    for (const title of Object.keys(grouped)) {
      const item = grouped[title];
      let targetCatId = defaultCatDoc._id;

      if (item.categoryName) {
        const specificCatIds = await getCategoryIdsByKey(item.categoryName);
        if (specificCatIds && specificCatIds.length > 0) {
          targetCatId = specificCatIds[0];
        }
      }

      const variants = [];
      const colorsSet = new Set();
      const sizesSet = new Set();
      const storageSet = new Set();
      const ramSet = new Set();
      const chipSet = new Set();

      item.rows.forEach((r) => {
        const color = (r["Color"] || r["Colour"] || "").toString().trim();
        const size = (r["Size / Case Size"] || r["Size"] || "")
          .toString()
          .trim();
        const storage = (r["Storage"] || r["Storga"] || r["Capacity"] || "").toString().trim();
        const ram = (r["RAM"] || r["Ram"] || "").toString().trim();
        const chip = (
          r["Chip / Processor"] ||
          r["Chip"] ||
          r["Processor"] ||
          ""
        )
          .toString()
          .trim();
        const partNumber = (
          r["Part Number"] ||
          r["Part Number (MPN)"] ||
          r["Part No"] ||
          r["MPN"] ||
          ""
        )
          .toString()
          .trim();
        const modelNumber = (r["Model Number"] || r["Model"] || "")
          .toString()
          .trim();
        const sku = (r["SKU"] || partNumber || "").toString().trim();
        const variantTitle = (
          r["Variant Title"] ||
          [color, ram, storage, size].filter(Boolean).join(" / ") ||
          title
        )
          .toString()
          .trim();

        const mrp = Math.max(
          0,
          parseFloat(r["Price"] || r["MRP (Price)"] || r["MRP"] || 0)
        );
        const discPercent = Math.max(
          0,
          parseFloat(r["Discount %"] || r["Discount"] || 0)
        );

        let finalPrice = parseFloat(r["Final Price"] || r["Discount Price"] || 0);
        if (!finalPrice || finalPrice <= 0 || finalPrice > mrp) {
          finalPrice =
            mrp > 0 ? Math.round(mrp - (mrp * discPercent) / 100) : mrp;
        }

        const stock = Math.max(0, parseInt(r["Stock"] || 0, 10));
        const rawImgs = (r["Images"] || "").toString().trim();
        const images = rawImgs
          ? rawImgs
              .split(",")
              .map((i) => i.trim())
              .filter(Boolean)
          : [];

        if (color) colorsSet.add(color);
        if (size) sizesSet.add(size);
        if (storage) storageSet.add(storage);
        if (ram) ramSet.add(ram);
        if (chip) chipSet.add(chip);

        const varColorHex = resolveColorHex(color);

        variants.push({
          title: variantTitle,
          displayTitle: variantTitle,
          color,
          colorHex: varColorHex,
          size,
          storage,
          ram,
          chip,
          processor: chip,
          price: mrp,
          discountPrice: finalPrice,
          stock,
          partNumber,
          modelNumber,
          sku,
          images,
        });
      });


      const minMrp =
        variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : 0;
      const minFinal =
        variants.length > 0
          ? Math.min(...variants.map((v) => v.discountPrice))
          : 0;
      const totalStock =
        variants.length > 0
          ? variants.reduce((acc, v) => acc + v.stock, 0)
          : 0;
      const firstImgs = variants.find(
        (v) => v.images && v.images.length > 0
      )?.images || ["/iphone_category_v2.jpg"];

      let existing = await Product.findOne({
        $or: [
          { title: item.title, category: targetCatId },
          { title: item.title },
          ...variants
            .map((v) => v.partNumber)
            .filter(Boolean)
            .map((pn) => ({ "variants.partNumber": pn })),
          ...variants
            .map((v) => v.sku)
            .filter(Boolean)
            .map((sk) => ({ "variants.sku": sk })),
        ],
      });

      if (existing) {
        existing.title = item.title;
        existing.category = targetCatId;
        existing.brand = item.brand || existing.brand || "Apple";
        if (item.description) existing.description = item.description;
        existing.price = minMrp || existing.price;
        existing.discountPrice = minFinal || existing.discountPrice;
        existing.stock = totalStock;
        const processedExcelColors = Array.from(colorsSet).map((cName) => {
          const matchedV = variants.find((v) => (v.color || "").toLowerCase() === cName.toLowerCase());
          const h = matchedV?.colorHex || resolveColorHex(cName);
          return { name: cName, value: h, colorHex: h };
        });

        existing.variants = variants;
        existing.colors = processedExcelColors;
        existing.sizes = Array.from(sizesSet);
        existing.storage = Array.from(storageSet);
        existing.ram = Array.from(ramSet);
        existing.processors = Array.from(chipSet);
        if (firstImgs.length > 0) existing.images = firstImgs;

        await existing.save();
        updatedCount++;
      } else {
        const slug = await generateUniqueSlug(item.title);
        const processedExcelColors = Array.from(colorsSet).map((cName) => {
          const matchedV = variants.find((v) => (v.color || "").toLowerCase() === cName.toLowerCase());
          const h = matchedV?.colorHex || resolveColorHex(cName);
          return { name: cName, value: h, colorHex: h };
        });

        await Product.create({
          title: item.title,
          slug,
          category: targetCatId,
          brand: item.brand || "Apple",
          description: item.description || `${item.title} by Apple.`,
          price: minMrp,
          discountPrice: minFinal,
          stock: totalStock,
          variants,
          colors: processedExcelColors,
          sizes: Array.from(sizesSet),
          storage: Array.from(storageSet),
          ram: Array.from(ramSet),
          processors: Array.from(chipSet),
          images: firstImgs,
          displayImage: firstImgs[0] || "",
        });
        createdCount++;
      }
    }

    res.status(200).json({
      message: `Excel sheet uploaded successfully! Created ${createdCount} new products, updated ${updatedCount} existing products.`,
      createdCount,
      updatedCount,
      categoryKey: category,
    });
  } catch (error) {
    console.error("Import Excel error:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  getProductById,
  adminGetStockHistory,
  exportProductsExcel,
  previewImportProductsExcel,
  importProductsExcel,
};

