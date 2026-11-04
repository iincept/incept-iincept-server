const mongoose = require("mongoose");
const Product = require("./models/Product");
const Category = require("./models/Category");

const MONGO_URI = "mongodb://localhost:27017/ecommerce17";

// Helper to generate slugs
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
};

const ALL_MOCK_PRODUCTS = [
  // --- iPhones ---
  {
    title: "iPhone 18 Pro",
    description: "The ultimate performance and camera of any iPhone, with exceptional battery life and next-generation A20 Pro Bionic chip.",
    price: 164900,
    images: ["https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/store-card-40-iphone-18-pro-202609?wid=800&hei=1000&fmt=p-jpg&qlt=80"],
    categoryName: "Smartphones",
    brand: "Apple",
    stock: 15,
    rating: 5.0,
    sizes: ["256GB", "512GB", "1TB"],
    colors: ["Deep Crimson", "Titanium Natural", "Space Black"]
  },
  {
    title: "iPhone Duo",
    description: "Reimagined dual-screen mobile experience. Hello, hello.",
    price: 299900,
    images: ["https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/store-card-40-iphone-duo-202609_GEO_IN?wid=800&hei=1000&fmt=p-jpg&qlt=80"],
    categoryName: "Smartphones",
    brand: "Apple",
    stock: 8,
    rating: 4.9,
    sizes: ["512GB", "1TB"],
    colors: ["Space Black", "Silver"]
  },
  {
    title: "Apple Watch Series 12",
    description: "The most accurate heart rate sensing in a wearable. Thinnest design ever with groundbreaking health sensors.",
    price: 56900,
    images: ["https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/store-card-40-watch-series-12-202609?wid=800&hei=1000&fmt=p-jpg&qlt=80"],
    categoryName: "Wearables",
    brand: "Apple",
    stock: 20,
    rating: 4.9,
    sizes: ["42mm", "46mm"],
    colors: ["Jet Black", "Rose Gold", "Silver"]
  },
  {
    title: "iPhone 17 Pro Max",
    description: "The pinnacle of mobile engineering. Built with Desert Titanium, features A19 Pro chip and dynamic camera lenses.",
    price: 149900,
    images: ["/iphone17p_orange_close.jpg", "/iphone17p_white.jpg", "/iphone17p_blue.jpg"],
    categoryName: "Smartphones",
    brand: "Apple",
    stock: 10,
    rating: 4.9,
    sizes: ["256GB", "512GB", "1TB"],
    colors: ["Desert Titanium", "Silver", "Dark Blue"]
  },
  {
    title: "iPhone 17 Pro",
    description: "Designed from the inside out to be the most powerful iPhone model ever made. Heat-forged titanium enclosure.",
    price: 134900,
    images: ["/iphone17p_orange_close.jpg", "/iphone17p_white.jpg", "/iphone17p_blue.jpg"],
    categoryName: "Smartphones",
    brand: "Apple",
    stock: 12,
    rating: 4.8,
    sizes: ["128GB", "256GB", "512GB", "1TB"],
    colors: ["Desert Titanium", "Silver", "Dark Blue"]
  },
  {
    title: "iPhone Air",
    description: "Sleek, featherlight, and incredibly powerful. Impossibly thin profile with aluminum-titanium alloy.",
    price: 119900,
    images: ["/iphone_air_group.jpg", "/iphone_air_blue_fb.jpg", "/iphone_air_lens.jpg", "/iphone_air_gold.jpg"],
    categoryName: "Smartphones",
    brand: "Apple",
    stock: 8,
    rating: 4.8,
    sizes: ["128GB", "256GB", "512GB"],
    colors: ["Light Blue", "Silver", "White", "Gold"]
  },
  {
    title: "iPhone 17",
    description: "Supercharged standard model with custom Apple Intelligence integration and sleek dual-lens matrix.",
    price: 80900,
    images: ["/iphone17_group_v2.jpg", "/iphone17_purple_fb.jpg", "/iphone_air_blue_fb.jpg"],
    categoryName: "Smartphones",
    brand: "Apple",
    stock: 15,
    rating: 4.7,
    sizes: ["128GB", "256GB"],
    colors: ["Lavender", "Blue", "Green", "Dark Gray", "White"]
  },
  {
    title: "iPhone 17e",
    description: "Premium everyday performance, slim glass build, features A18 custom chips.",
    price: 119900,
    images: ["/iphone17e_group.jpg", "/iphone17e_purple_fb.jpg", "/iphone17e_purple_hand.jpg"],
    categoryName: "Smartphones",
    brand: "Apple",
    stock: 6,
    rating: 4.9,
    sizes: ["256GB", "512GB", "1TB"],
    colors: ["Lavender", "Blue", "Green", "Silver", "Gold", "Space Gray"]
  },
  {
    title: "iPhone 16",
    description: "Powerful standard specs. Dual horizontal camera layouts, A18 processors.",
    price: 79900,
    images: ["/iphone16_group_v2.jpg", "/iphone16_blue_fb.jpg", "/iphone16_pink_hand.jpg"],
    categoryName: "Smartphones",
    brand: "Apple",
    stock: 14,
    rating: 4.6,
    sizes: ["128GB", "256GB"],
    colors: ["Pink", "Blue", "Green", "Black", "White"]
  },

  // --- MacBooks ---
  {
    title: "MacBook Pro 16-inch (M4 Max)",
    description: "Absolute powerhouse for computational tasks, 4K rendering, and deep learning configurations.",
    price: 349900,
    images: ["/macbook_category_v3.jpg"],
    categoryName: "Laptops & PCs",
    brand: "Apple",
    stock: 5,
    rating: 5.0,
    sizes: ["36GB unified memory", "48GB unified memory", "128GB unified memory"],
    colors: ["Space Black", "Silver"]
  },
  {
    title: "MacBook Pro 14-inch (M4 Pro)",
    description: "Premium compact performance. Liquid Retina XDR display, pro workflow bandwidth.",
    price: 199900,
    images: ["/macbook_category_v3.jpg"],
    categoryName: "Laptops & PCs",
    brand: "Apple",
    stock: 8,
    rating: 4.9,
    sizes: ["24GB unified memory", "36GB unified memory"],
    colors: ["Space Black", "Silver"]
  },
  {
    title: "MacBook Air 15-inch (M3)",
    description: "Strikingly thin, large canvas. Fanless silent design with all-day battery life.",
    price: 134900,
    images: ["/macbook_category_v3.jpg"],
    categoryName: "Laptops & PCs",
    brand: "Apple",
    stock: 10,
    rating: 4.8,
    sizes: ["8GB RAM", "16GB RAM", "24GB RAM"],
    colors: ["Midnight", "Starlight", "Space Gray", "Silver"]
  },
  {
    title: "MacBook Air 13-inch (M3)",
    description: "Ultimate portability meets high speed. Supercharged by the M3 chip in an incredibly thin profile.",
    price: 114900,
    images: ["/macbook_category_v3.jpg"],
    categoryName: "Laptops & PCs",
    brand: "Apple",
    stock: 12,
    rating: 4.7,
    sizes: ["8GB RAM", "16GB RAM", "24GB RAM"],
    colors: ["Midnight", "Starlight", "Space Gray", "Silver"]
  },
  {
    title: "MacBook Pro 16-inch (M3 Max)",
    description: "Extreme speed for developers and video creators. Stunning Liquid Retina display and vast ports array.",
    price: 299900,
    images: ["/macbook_category_v2.jpg"],
    categoryName: "Laptops & PCs",
    brand: "Apple",
    stock: 3,
    rating: 4.9,
    sizes: ["36GB RAM", "48GB RAM", "128GB RAM"],
    colors: ["Space Black", "Silver"]
  },
  {
    title: "MacBook Pro 14-inch (M3 Pro)",
    description: "Stunning computing efficiency. M3 Pro chip inside a durable aerospace aluminum space black build.",
    price: 169900,
    images: ["/macbook_category_v2.jpg"],
    categoryName: "Laptops & PCs",
    brand: "Apple",
    stock: 4,
    rating: 4.8,
    sizes: ["18GB RAM", "36GB RAM"],
    colors: ["Space Black", "Silver"]
  },
  {
    title: "MacBook Air 13-inch (M2)",
    description: "Incredibly thin aluminum design, A-grade battery backup, and bright Liquid Retina panel.",
    price: 99900,
    images: ["/macbook_category_v3.jpg"],
    categoryName: "Laptops & PCs",
    brand: "Apple",
    stock: 15,
    rating: 4.6,
    sizes: ["8GB RAM", "16GB RAM"],
    colors: ["Midnight", "Space Gray", "Silver"]
  },
  {
    title: "MacBook Pro 13-inch (M2)",
    description: "Powerhouse compact model with active thermal system, touch bar keyboard layout.",
    price: 129900,
    images: ["/macbook_category_v2.jpg"],
    categoryName: "Laptops & PCs",
    brand: "Apple",
    stock: 7,
    rating: 4.6,
    sizes: ["8GB RAM", "16GB RAM"],
    colors: ["Space Gray", "Silver"]
  },

  // --- iPads ---
  {
    title: "iPad Pro 13-inch (M4)",
    description: "Mind-blowingly thin layout. Tandem OLED Ultra Retina display, next-gen chip speed.",
    price: 129900,
    images: ["/ipad_category_v2.jpg"],
    categoryName: "iPads",
    brand: "Apple",
    stock: 12,
    rating: 5.0,
    sizes: ["256GB", "512GB", "1TB"],
    colors: ["Space Black", "Silver"]
  },
  {
    title: "iPad Pro 11-inch (M4)",
    description: "Ultimate power in an 11-inch size. Powered by M4, Tandem OLED, and matches Apple Pencil Pro features.",
    price: 99900,
    images: ["/ipad_category_v2.jpg", "/ipad_category.jpg"],
    categoryName: "iPads",
    brand: "Apple",
    stock: 9,
    rating: 4.9,
    sizes: ["256GB", "512GB", "1TB"],
    colors: ["Space Black", "Silver"]
  },
  {
    title: "iPad Air 13-inch (M4)",
    description: "Vibrant screen capabilities. High-performance pencil layout, sleek chassis.",
    price: 79900,
    images: ["/ipad_air_blue.jpg"],
    categoryName: "iPads",
    brand: "Apple",
    stock: 15,
    rating: 4.8,
    sizes: ["128GB", "256GB"],
    colors: ["Space Gray", "Starlight", "Purple", "Blue"]
  },
  {
    title: "iPad Air 11-inch (M4)",
    description: "Supercharged by M4. Featuring a beautiful 11-inch Liquid Retina display, landscape front camera, and fast Wi-Fi 6E.",
    price: 59900,
    images: ["/ipad_air_blue.jpg", "/ipad_category_v2.jpg", "/ipad_category.jpg"],
    categoryName: "iPads",
    brand: "Apple",
    stock: 12,
    rating: 4.7,
    sizes: ["128GB", "256GB", "512GB"],
    colors: ["Space Gray", "Starlight", "Purple", "Blue"]
  },
  {
    title: "iPad 10.9-inch (10th Gen)",
    description: "Colorfully reimagined iPad for everyday tasks. Features full-screen Liquid Retina display, A14 Bionic, and USB-C.",
    price: 39900,
    images: ["/ipad_category.jpg", "/ipad_air_blue.jpg", "/ipad_category_v2.jpg"],
    categoryName: "iPads",
    brand: "Apple",
    stock: 15,
    rating: 4.7,
    sizes: ["64GB", "256GB"],
    colors: ["Silver", "Blue", "Pink", "Yellow"]
  },
  {
    title: "iPad mini (A17 Pro)",
    description: "Ultra-portable design in an 8.3-inch size. Supercharged by A17 Pro with support for Apple Pencil Pro.",
    price: 49900,
    images: ["/ipad_category_v2.jpg"],
    categoryName: "iPads",
    brand: "Apple",
    stock: 20,
    rating: 4.8,
    sizes: ["128GB", "256GB", "512GB"],
    colors: ["Space Gray", "Blue", "Purple", "Starlight"]
  },
  {
    title: "iPad Pro 12.9-inch (M2)",
    description: "Extreme processing speed. Liquid Retina XDR screen display, pro workflows bandwidth capabilities.",
    price: 119900,
    images: ["/ipad_category.jpg", "/ipad_category_v2.jpg"],
    categoryName: "iPads",
    brand: "Apple",
    stock: 4,
    rating: 4.9,
    sizes: ["128GB", "256GB", "512GB", "1TB"],
    colors: ["Space Gray", "Silver"]
  },

  // --- Watches ---
  {
    title: "Apple Watch Ultra 2",
    description: "Premium athletic gear. Heavy duty titanium frame, precise dual GPS navigation.",
    price: 89900,
    images: ["/watch_category.jpg"],
    categoryName: "Wearables",
    brand: "Apple",
    stock: 15,
    rating: 5.0,
    sizes: ["49mm Loop Strap"],
    colors: ["Titanium", "Black"]
  },
  {
    title: "Apple Watch Series 10",
    description: "Slimmest casing ever. Extra-large wide-angle OLED display, sleep apnea monitoring notifications.",
    price: 46900,
    images: ["/watch_category.jpg"],
    categoryName: "Wearables",
    brand: "Apple",
    stock: 22,
    rating: 4.8,
    sizes: ["42mm", "46mm"],
    colors: ["Jet Black", "Rose Gold", "Silver"]
  },
  {
    title: "Apple Watch SE",
    description: "All the essentials. Easy ways to stay active, connected, track health, and get assistance when needed.",
    price: 24900,
    images: ["/watch_category.jpg"],
    categoryName: "Wearables",
    brand: "Apple",
    stock: 30,
    rating: 4.6,
    sizes: ["40mm", "44mm"],
    colors: ["Midnight", "Starlight", "Silver"]
  },
  {
    title: "Apple Watch SE 3",
    description: "Essential health & fitness features with upgraded performance. Available in 40mm and 44mm aluminum case options.",
    price: 29900,
    images: ["/apple_watch_three_models.jpg", "/watch_nav/watch_se.png"],
    categoryName: "Wearables",
    brand: "Apple",
    stock: 25,
    rating: 4.8,
    sizes: ["40mm", "44mm"],
    colors: ["Midnight", "Starlight", "Silver"]
  },
  {
    title: "Apple Watch Hermès Series 10",
    description: "Luxury craftsmanship meets digital innovation. Hermès exclusive straps, customized active dials.",
    price: 119900,
    images: ["/watch_category.jpg"],
    categoryName: "Wearables",
    brand: "Apple",
    stock: 2,
    rating: 4.9,
    sizes: ["46mm Single Tour Strap"],
    colors: ["Orange", "Indigo"]
  },

  // --- AirPods / Audio ---
  {
    title: "AirPods Max (USB-C)",
    description: "High-fidelity audio design. Anodized aluminum cups, premium acoustics profile.",
    price: 59900,
    images: ["/airpods_pro_3.jpg"],
    categoryName: "Premium Audio",
    brand: "Apple",
    stock: 11,
    rating: 4.9,
    sizes: ["Over-ear headband"],
    colors: ["Midnight", "Starlight", "Blue", "Purple", "Orange"]
  },
  {
    title: "AirPods Pro 2",
    description: "Next-level smart active cancellation. Adaptive audio transparency settings.",
    price: 24900,
    images: ["/airpods_pro_3.jpg"],
    categoryName: "Premium Audio",
    brand: "Apple",
    stock: 25,
    rating: 5.0,
    sizes: ["Magsafe Case"],
    colors: ["White"]
  },
  {
    title: "AirPods 4 (with Active Noise Cancellation)",
    description: "Reengineered for fit and acoustic performance. Now featuring Active Noise Cancellation for open ears.",
    price: 17900,
    images: ["/airpods_pro_3.jpg"],
    categoryName: "Premium Audio",
    brand: "Apple",
    stock: 18,
    rating: 4.8,
    sizes: ["Wireless charging case"],
    colors: ["White"]
  },
  {
    title: "AirPods 4",
    description: "Excellent acoustic performance. Comfortable open-ear geometry casing, long battery backup.",
    price: 12900,
    images: ["/airpods_pro_3.jpg"],
    categoryName: "Premium Audio",
    brand: "Apple",
    stock: 20,
    rating: 4.6,
    sizes: ["USB-C charging case"],
    colors: ["White"]
  },
  {
    title: "AirPods Max (Lightning)",
    description: "High-fidelity acoustics featuring lightning jack inputs. Active noise isolation headband mesh.",
    price: 49900,
    images: ["/airpods_pro_3.jpg"],
    categoryName: "Premium Audio",
    brand: "Apple",
    stock: 5,
    rating: 4.7,
    sizes: ["Over-ear headband"],
    colors: ["Space Gray", "Silver"]
  },

  // --- TV & Home ---
  {
    title: "Apple TV 4K",
    description: "Ultimate home theater box. Stream cinematic HDR videos, dynamic audio surround output.",
    price: 14900,
    images: ["/tv_home_homepods.jpg"],
    categoryName: "TV & Home",
    brand: "Apple",
    stock: 18,
    rating: 4.9,
    sizes: ["64GB Wi-Fi", "128GB Ethernet"],
    colors: ["Black"]
  },
  {
    title: "HomePod (2nd Gen)",
    description: "Room-filling high-fidelity acoustics. Siri smart assistant controls integrated.",
    price: 32900,
    images: ["/tv_home_homepods.jpg"],
    categoryName: "TV & Home",
    brand: "Apple",
    stock: 12,
    rating: 4.8,
    sizes: ["Stereo speaker unit"],
    colors: ["Midnight", "White"]
  },
  {
    title: "HomePod mini",
    description: "Surprisingly big sound for a tiny smart speaker. Seamless smart automation, intercom controls.",
    price: 10900,
    images: ["/tv_home_homepods.jpg"],
    categoryName: "TV & Home",
    brand: "Apple",
    stock: 20,
    rating: 4.7,
    sizes: ["Mini sphere speaker"],
    colors: ["Midnight", "White", "Yellow", "Orange", "Blue"]
  },
  {
    title: "HomePod (1st Gen)",
    description: "Original deep acoustics champion. Precision spatial room sensing technologies.",
    price: 26900,
    images: ["/tv_home_homepods.jpg"],
    categoryName: "TV & Home",
    brand: "Apple",
    stock: 0,
    rating: 4.6,
    sizes: ["Original speaker unit"],
    colors: ["Space Gray", "White"]
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB for Seeding...");

    for (const mock of ALL_MOCK_PRODUCTS) {
      // Find category ID
      const catDoc = await Category.findOne({ name: mock.categoryName });
      if (!catDoc) {
        console.warn(`Category "${mock.categoryName}" not found. Skipping "${mock.title}"`);
        continue;
      }

      // Check if product already exists
      const existing = await Product.findOne({ title: mock.title });
      if (existing) {
        console.log(`Product "${mock.title}" already exists. Skipping.`);
        continue;
      }

      // Create product
      const slug = slugify(mock.title);
      await Product.create({
        title: mock.title,
        slug,
        description: mock.description,
        price: mock.price,
        images: mock.images,
        category: catDoc._id,
        brand: mock.brand,
        stock: mock.stock,
        rating: mock.rating,
        sizes: mock.sizes,
        colors: mock.colors
      });
      console.log(`Seeded new product: "${mock.title}" under category "${mock.categoryName}"`);
    }

    console.log("Seeding complete!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--allow-production")) {
    console.error("SAFETY ERROR: Running product seed in production requires explicit --allow-production flag.");
    process.exit(1);
  }
  seed();
}

module.exports = seed;
