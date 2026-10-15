const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    logo: {
      type: String,
      default: "",
    },
    businessEmail: {
      type: String,
      default: "support@iincept.com",
    },
    businessPhone: {
      type: String,
      default: "+91 99999 99999",
    },
    supportHours: {
      type: String,
      default: "Mon – Sat: 9:00 AM to 6:00 PM IST",
    },
    socialLinks: {
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      twitter: { type: String, default: "" },
    },
    // New IndiaStore Style Home Banner Settings
    homeHeroBadge: {
      type: String,
      default: "Apple Authorised Resellers across India",
    },
    homeHeroTitle: {
      type: String,
      default: "The latest.\nThe best. Authorised.",
    },
    homeHeroSubtitle: {
      type: String,
      default: "Genuine Apple products from India’s trusted mono-brand premium resellers. Exclusive offers, EMI & expert support.",
    },
    homeHeroPrimaryBtnText: {
      type: String,
      default: "Shop Now",
    },
    homeHeroPrimaryBtnLink: {
      type: String,
      default: "/iphone",
    },
    homeHeroSecondaryBtnText: {
      type: String,
      default: "Find Nearest Store",
    },
    homeHeroSecondaryBtnLink: {
      type: String,
      default: "#store-locator",
    },
    homeHeroImage: {
      type: String,
      default: "",
    },
    // Deal of the Week Banner Settings
    dealEyebrow: {
      type: String,
      default: "Deal of the Week",
    },
    dealTitle: {
      type: String,
      default: "MacBook Neo – Stock Clearance",
    },
    dealDesc: {
      type: String,
      default: "Amazing Mac at a surprising price. Limited stock this week. Exclusive bank offers + free AppleCare+ for first 50 buyers.",
    },
    dealPrice: {
      type: String,
      default: "₹72,900",
    },
    dealOldPrice: {
      type: String,
      default: "₹79,900",
    },
    dealButtonText: {
      type: String,
      default: "Grab the Deal",
    },
    dealButtonLink: {
      type: String,
      default: "/macbook",
    },
    dealImage: {
      type: String,
      default: "/mac_deal_fan.png",
    },
    homeDealBanners: [
      {
        id: { type: String, default: "" },
        internalName: { type: String, default: "" },
        dealEyebrow: { type: String, default: "DEAL OF THE WEEK" },
        dealTitle: { type: String, default: "" },
        dealDesc: { type: String, default: "" },
        productId: { type: String, default: "" },
        dealImage: { type: String, default: "/mac_deal_fan.png" },
        mrp: { type: Number, default: 79900 },
        discount: { type: Number, default: 0 },
        dealPrice: { type: Number, default: 72900 },
        dealButtonText: { type: String, default: "Grab the Deal" },
        dealButtonLink: { type: String, default: "/macbook" },
        displayOrder: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
      },
    ],
    homeCategoryIcons: [
      {
        name: { type: String, default: "" },
        label: { type: String, default: "" },
        image: { type: String, default: "" },
        path: { type: String, default: "" },
        isActive: { type: Boolean, default: true },
      },
    ],
    homeNewArrivals: [
      {
        id: { type: String, default: "" },
        productId: { type: String, default: "" },
        name: { type: String, default: "" },
        tagline: { type: String, default: "" },
        price: { type: String, default: "" },
        monthlyPrice: { type: String, default: "" },
        image: { type: String, default: "" },
        path: { type: String, default: "" },
        isActive: { type: Boolean, default: true }
      }
    ],
    heroTitle1: {
      type: String,
      default: "Apple devices for your business, sourced right, delivered anywhere in India.",
    },
    heroSubtitle1: {
      type: String,
      default: "Bulk pricing, GST invoicing, dedicated account support and consolidated billing.",
    },
    heroButtonText1: {
      type: String,
      default: "Request Bulk Quote →",
    },
    heroTitle2: {
      type: String,
      default: "The latest Apple lineup, in stock and ready to ship today.",
    },
    heroSubtitle2: {
      type: String,
      default: "From the newest iPhone 17 series to our best-selling MacBooks and AirPods.",
    },
    heroButtonText2: {
      type: String,
      default: "Browse Catalogue →",
    },
    heroTitle3: {
      type: String,
      default: "Official AppleCare+ protection for total peace of mind.",
    },
    heroSubtitle3: {
      type: String,
      default: "Protect your team's Apple devices with genuine AppleCare+ coverage and priority tech support.",
    },
    heroButtonText3: {
      type: String,
      default: "Explore AppleCare+ →",
    },
    heroTitle4: {
      type: String,
      default: "Corporate gifting & exclusive institutional offers.",
    },
    heroSubtitle4: {
      type: String,
      default: "Customized procurement packages for corporate rewards and volume discounts on premium accessories.",
    },
    heroButtonText4: {
      type: String,
      default: "Explore Accessories →",
    },
    heroSlides: [
      {
        title: { type: String, default: "" },
        badge: { type: String, default: "" },
        titleBold: { type: String, default: "" },
        titleNormal: { type: String, default: "" },
        subtitle: { type: String, default: "" },
        buttonText: { type: String, default: "Learn More →" },
        buttonLink: { type: String, default: "#" },
        secondaryButtonText: { type: String, default: "Find Nearest Store" },
        secondaryButtonLink: { type: String, default: "#store-locator" },
        image: { type: String, default: "" },
        mobileImage: { type: String, default: "" },
        bgStyle: { type: String, default: "slide-dark" },
        isActive: { type: Boolean, default: true },
        hideText: { type: Boolean, default: false },
        imageFit: { type: String, default: "contain" }, // contain, cover
        focalPosition: { type: String, default: "right" }, // right, center, left
        textAlignment: { type: String, default: "left" }, // left, center
        overlayStyle: { type: String, default: "gradient" }, // gradient, none, solid
        order: { type: Number, default: 0 },
        stat1Bold: { type: String, default: "GST invoicing" },
        stat1Normal: { type: String, default: "on every order" },
        stat2Bold: { type: String, default: "Volume pricing" },
        stat2Normal: { type: String, default: "on bulk orders" },
        stat3Bold: { type: String, default: "Pan-India" },
        stat3Normal: { type: String, default: "delivery & tracking" },
      },
    ],
    appleCategories: [
      {
        name: { type: String, default: "" },
        actionText: { type: String, default: "Shop all models →" },
        link: { type: String, default: "/shop" },
        image: { type: String, default: "" },
        cardTheme: { type: String, default: "dark" },
        isActive: { type: Boolean, default: true },
      },
    ],
    testimonials: [
      {
        stars: { type: Number, default: 5 },
        text: { type: String, default: "" },
        author: { type: String, default: "" },
        sub: { type: String, default: "" },
        location: { type: String, default: "" },
        image: { type: String, default: "" },
        isActive: { type: Boolean, default: true },
      },
    ],
    navbarMenuItems: [
      {
        name: { type: String, default: "" },
        link: { type: String, default: "/shop" },
        isActive: { type: Boolean, default: true },
        dropdownItems: [
          {
            label: { type: String, default: "" },
            path: { type: String, default: "" },
            query: { type: String, default: "" },
            image: { type: String, default: "" },
            price: { type: String, default: "" },
            isActive: { type: Boolean, default: true }
          }
        ]
      },
    ],
    categoryIconGroups: [
      {
        categoryKey: { type: String, default: "" },
        categoryName: { type: String, default: "" },
        icons: [
          {
            label: { type: String, default: "" },
            path: { type: String, default: "" },
            query: { type: String, default: "" },
            image: { type: String, default: "" },
            price: { type: String, default: "" },
            isActive: { type: Boolean, default: true }
          }
        ]
      }
    ],
    appleCarePlans: [
      {
        categoryKey: { type: String, default: "" },
        title: { type: String, default: "" },
        subtitle: { type: String, default: "" },
        price: { type: Number, default: 0 },
        priceDisplay: { type: String, default: "" },
        image: { type: String, default: "" },
        features: [{ type: String }],
        isActive: { type: Boolean, default: true }
      }
    ],
    appleCarePricingTables: [
      {
        categoryKey: { type: String, default: "" },
        image: { type: String, default: "" },
        headline: { type: String, default: "" },
        headerTitle: { type: String, default: "AppleCare+" },
        subheadline: { type: String, default: "" },
        durationLabel: { type: String, default: "3 years" },
        isActive: { type: Boolean, default: true },
        rows: [
          {
            model: { type: String, default: "" },
            title: { type: String, default: "" },
            description: { type: String, default: "" },
            description1yr: { type: String, default: "" },
            description2yr: { type: String, default: "" },
            sku: { type: String, default: "" },
            sku1yr: { type: String, default: "" },
            sku2yr: { type: String, default: "" },
            mrp: { type: String, default: "" },
            mrp1yr: { type: String, default: "" },
            mrp2yr: { type: String, default: "" },
            discount: { type: String, default: "" },
            discount1yr: { type: String, default: "" },
            discount2yr: { type: String, default: "" },
            salePrice: { type: String, default: "" },
            salePrice1yr: { type: String, default: "" },
            salePrice2yr: { type: String, default: "" },
            monthly: { type: String, default: "" },
            yearly: { type: String, default: "" },
            image: { type: String, default: "" },
            planType: { type: String, default: "APPLE CARE+" },
            duration: { type: String, default: "1 Year & 2 Years" },
            features: [{ type: String }],
            isActive: { type: Boolean, default: true }
          }
        ]
      }
    ],
    productAppleCare: {
      isEnabled: { type: Boolean, default: true },
      title: { type: String, default: "Add AppleCare+" },
      monthlyPriceText: { type: String, default: "From ₹2,817.00/mo.◊" },
      mrpText: { type: String, default: "or MRP ₹16,900.00 (inclusive of all taxes)" },
      features: [
        { type: String }
      ],
      categoryPrices: [
        {
          categoryName: { type: String, default: "" },
          monthlyPrice: { type: String, default: "" },
          mrpPrice: { type: String, default: "" }
        }
      ]
    },
    footerSections: [
      {
        title: { type: String, default: "" },
        links: [
          {
            label: { type: String, default: "" },
            url: { type: String, default: "" },
            isActive: { type: Boolean, default: true },
          },
        ],
        isActive: { type: Boolean, default: true },
      },
    ],
    featuredProductIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    shippingCharge: {
      type: Number,
      default: 99,
    },
    taxPercentage: {
      type: Number,
      default: 18,
    },
    freeShippingThreshold: {
      type: Number,
      default: 1499,
    },
    announcement: {
      type: String,
      default: "🔥 FREE SHIPPING ABOVE INR 1499",
    },
    announcementBold: {
      type: String,
      default: "🔥 FREE SHIPPING",
    },
    announcementNormal: {
      type: String,
      default: "ON ORDERS ABOVE INR 1,499",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Setting", settingSchema);
