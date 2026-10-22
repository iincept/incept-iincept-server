const Setting = require("../models/Setting");

// Get site settings (Public)
const getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      // Create default settings if not exists
      settings = await Setting.create({});
    }

    if (!settings.homeHeroBadge) settings.homeHeroBadge = "Apple Authorised Resellers across India";
    if (!settings.homeHeroTitle) settings.homeHeroTitle = "The latest.\nThe best. Authorised.";
    if (!settings.homeHeroSubtitle) settings.homeHeroSubtitle = "Genuine Apple products from India’s trusted mono-brand premium resellers. Exclusive offers, EMI & expert support.";
    if (!settings.homeHeroPrimaryBtnText) settings.homeHeroPrimaryBtnText = "Shop Now";
    if (!settings.homeHeroPrimaryBtnLink) settings.homeHeroPrimaryBtnLink = "/iphone";
    if (!settings.homeHeroSecondaryBtnText) settings.homeHeroSecondaryBtnText = "Find Nearest Store";
    if (!settings.homeHeroSecondaryBtnLink) settings.homeHeroSecondaryBtnLink = "#store-locator";

    const DEFAULT_CATEGORY_IMAGES = {
      'Mac': '/mac_category_uploaded.png',
      'iPhone': '/iphone_category_uploaded.png',
      'iPad': '/ipad_category_uploaded.png',
      'Watch': '/watch_category_uploaded.png',
      'AirPods': '/airpods_category_uploaded.png',
      'AirTag': '/airtag_category_uploaded.png',
      'Apple TV 4K': '/appletv_category_uploaded.png',
      'HomePod': '/homepod_category_uploaded.png',
      'Accessories': '/accessories_category_uploaded.png',
    };

    if (!settings.homeCategoryIcons || settings.homeCategoryIcons.length === 0) {
      settings.homeCategoryIcons = [
        { name: 'Mac', label: 'Mac', image: DEFAULT_CATEGORY_IMAGES['Mac'], path: '/macbook', isActive: true },
        { name: 'iPhone', label: 'iPhone', image: DEFAULT_CATEGORY_IMAGES['iPhone'], path: '/iphone', isActive: true },
        { name: 'iPad', label: 'iPad', image: DEFAULT_CATEGORY_IMAGES['iPad'], path: '/ipad', isActive: true },
        { name: 'Watch', label: 'Watch', image: DEFAULT_CATEGORY_IMAGES['Watch'], path: '/watch', isActive: true },
        { name: 'AirPods', label: 'AirPods', image: DEFAULT_CATEGORY_IMAGES['AirPods'], path: '/airpods', isActive: true },
        { name: 'AirTag', label: 'AirTag', image: DEFAULT_CATEGORY_IMAGES['AirTag'], path: '/airtag', isActive: true },
        { name: 'Apple TV 4K', label: 'Apple TV 4K', image: DEFAULT_CATEGORY_IMAGES['Apple TV 4K'], path: '/tv-home', isActive: true },
        { name: 'HomePod', label: 'HomePod', image: DEFAULT_CATEGORY_IMAGES['HomePod'], path: '/tv-home?search=HomePod', isActive: true },
        { name: 'Accessories', label: 'Accessories', image: DEFAULT_CATEGORY_IMAGES['Accessories'], path: '/accessories', isActive: true },
      ];
      await settings.save();
    } else {
      // Update existing category icons if using old/broken images or local fallback paths
      let updated = false;

      // Remove Gift Card if present
      const initialLength = settings.homeCategoryIcons.length;
      settings.homeCategoryIcons = settings.homeCategoryIcons.filter(item => {
        const nameKey = item.name || item.label;
        return nameKey !== 'Gift Card';
      });
      if (settings.homeCategoryIcons.length !== initialLength) {
        updated = true;
      }

      settings.homeCategoryIcons = settings.homeCategoryIcons.map(item => {
        let obj = item.toObject ? item.toObject() : item;
        const key = obj.name || obj.label;
        const currentImg = (obj.image || '').trim();

        if (!currentImg || currentImg.includes('…') || currentImg.includes('traceId') || currentImg.startsWith('*') || currentImg.includes('/category_strip/')) {
          if (DEFAULT_CATEGORY_IMAGES[key]) {
            updated = true;
            return { ...obj, image: DEFAULT_CATEGORY_IMAGES[key] };
          }
        }
        return item;
      });
      if (updated) {
        settings.markModified('homeCategoryIcons');
        await settings.save();
      }
    }

    const defaultArrivals = [
      { id: '1', productId: '', name: 'iPhone Duo', tagline: 'Hello, hello.', price: 'From ₹2,99,900.00', monthlyPrice: 'or ₹12,495/mo.*', image: 'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/store-card-40-iphone-duo-202609_GEO_IN?wid=800&hei=1000&fmt=p-jpg&qlt=80', path: '/iphone', isActive: true },
      { id: '2', productId: '', name: 'iPhone 18 Pro', tagline: 'The ultimate performance and camera of any iPhone, with exceptional battery life.', price: 'From ₹1,64,900.00', monthlyPrice: 'or ₹6,870/mo.*', image: 'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/store-card-40-iphone-18-pro-202609?wid=800&hei=1000&fmt=p-jpg&qlt=80', path: '/iphone', isDark: true, isActive: true },
      { id: '3', productId: '', name: 'Apple Watch Series 12', tagline: 'The most accurate heart rate sensing in a wearable.', price: 'From ₹56,900.00', monthlyPrice: 'or ₹2,370/mo.*', image: 'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/store-card-40-watch-series-12-202609?wid=800&hei=1000&fmt=p-jpg&qlt=80', path: '/watch', isDark: true, isActive: true },
      { id: '4', productId: '', name: 'Apple Watch Ultra 4', tagline: 'The ultimate sports and adventure watch.', price: 'From ₹89,900.00', monthlyPrice: 'or ₹3,745/mo.*', image: 'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/store-card-40-watch-ultra-4-202609_GEO_IN?wid=800&hei=1000&fmt=p-jpg&qlt=80', path: '/watch', isDark: true, isActive: true },
      { id: '5', productId: '', name: 'AirPods 5', tagline: 'Discover the magic of Active Noise Cancellation.', price: 'From ₹14,900.00', monthlyPrice: 'or ₹620/mo.*', image: 'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/store-card-40-airpods-5-202609?wid=800&hei=1000&fmt=p-jpg&qlt=80', path: '/airpods', isDark: false, isActive: true }
    ];

    if (!settings.homeNewArrivals || settings.homeNewArrivals.length === 0) {
      settings.homeNewArrivals = defaultArrivals;
      settings.markModified('homeNewArrivals');
      await settings.save();
    }

    const defaultDealBanners = [
      {
        id: 'deal-1',
        internalName: 'MacBook Neo – Stock Clearance',
        dealEyebrow: 'DEAL OF THE WEEK',
        dealTitle: 'MacBook Neo – Stock Clearance',
        dealDesc: 'Amazing Mac at a surprising price. Limited stock this week. Exclusive bank offers + free AppleCare+ for first 50 buyers.',
        productId: '',
        dealImage: '/mac_deal_fan.png',
        mrp: 79900,
        discount: 8.76,
        dealPrice: 72900,
        dealButtonText: 'Grab the Deal',
        dealButtonLink: '/macbook',
        displayOrder: 1,
        isActive: true
      },
      {
        id: 'deal-2',
        internalName: 'MacBook Neo – Limited Time Deal',
        dealEyebrow: 'DEAL OF THE WEEK',
        dealTitle: 'MacBook Neo – Limited Time Deal',
        dealDesc: 'Get the incredible MacBook Neo with extraordinary battery life and performance. Limited time discount offer.',
        productId: '',
        dealImage: '/mac_deal_fan.png',
        mrp: 79900,
        discount: 10,
        dealPrice: 71910,
        dealButtonText: 'Grab the Deal',
        dealButtonLink: '/macbook',
        displayOrder: 2,
        isActive: true
      }
    ];

    if (!settings.homeDealBanners || settings.homeDealBanners.length === 0) {
      settings.homeDealBanners = defaultDealBanners;
      settings.markModified('homeDealBanners');
      await settings.save();
    }

    if (!settings.heroSlides || settings.heroSlides.length === 0) {
      settings.heroSlides = [
        {
          title: settings.heroTitle1 || "Apple devices for your business, sourced right, delivered anywhere in India.",
          subtitle: settings.heroSubtitle1 || "Bulk pricing, GST invoicing, dedicated account support and consolidated billing — built for IT teams, gifting desks and resellers, not one-off retail buyers.",
          buttonText: settings.heroButtonText1 || "Request Bulk Quote →",
          buttonLink: "#procurement-section",
          image: "",
          bgStyle: "slide-dark",
          isActive: true,
        },
        {
          title: settings.heroTitle2 || "The latest Apple lineup, in stock and ready to ship today.",
          subtitle: settings.heroSubtitle2 || "From the newest iPhone 17 series to our best-selling MacBooks and AirPods — explore the full range and place your order in minutes, no quote required.",
          buttonText: settings.heroButtonText2 || "Browse Catalogue →",
          buttonLink: "#apple-categories",
          image: "",
          bgStyle: "slide-light",
          isActive: true,
        },
        {
          title: settings.heroTitle3 || "Official AppleCare+ protection for total peace of mind.",
          subtitle: settings.heroSubtitle3 || "Protect your team's Apple devices with genuine AppleCare+ coverage, priority tech support, and zero-hassle hardware replacement.",
          buttonText: settings.heroButtonText3 || "Explore AppleCare+ →",
          buttonLink: "/apple-care",
          image: "",
          bgStyle: "slide-dark-blue",
          isActive: true,
        },
        {
          title: settings.heroTitle4 || "Corporate gifting & exclusive institutional offers.",
          subtitle: settings.heroSubtitle4 || "Customized procurement packages for corporate rewards, employee onboarding kits, and volume discounts on premium accessories.",
          buttonText: settings.heroButtonText4 || "Explore Accessories →",
          buttonLink: "/accessories",
          image: "",
          bgStyle: "slide-warm",
          isActive: true,
        },
      ];
      await settings.save();
    }

    if (!settings.appleCategories || settings.appleCategories.length === 0) {
      settings.appleCategories = [
        { name: 'Mac', actionText: 'Shop all models →', link: '/macbook', image: 'https://i3-prod-assets.indiaistore.com/files/uploads/categories/mac/home-img-1776683069_8064.png', cardTheme: 'light', isActive: true },
        { name: 'iPhone', actionText: 'Shop all models →', link: '/iphone', image: 'https://i3-prod-assets.indiaistore.com/files/uploads/categories/iphone/home-img-1776683084_2967.png', cardTheme: 'dark', isActive: true },
        { name: 'iPad', actionText: 'Shop all models →', link: '/ipad', image: 'https://i3-prod-assets.indiaistore.com/files/uploads/categories/ipad/home-img-1776683096_1014.png', cardTheme: 'dark', isActive: true },
        { name: 'Watch', actionText: 'Shop all models →', link: '/watch', image: 'https://i3-prod-assets.indiaistore.com/files/uploads/categories/watch/home-img-1757682221_3904.jpg', cardTheme: 'dark', isActive: true },
        { name: 'AirPods', actionText: 'Shop all models →', link: '/airpods', image: 'https://i3-prod-assets.indiaistore.com/files/uploads/categories/music/home-img-1757682200_3577.jpg', cardTheme: 'grey', isActive: true },
        { name: 'TV & Home', actionText: 'Shop all models →', link: '/tv-home', image: 'https://i3-prod-assets.indiaistore.com/files/uploads/categories/tv/home-img-1694070636_757.png', cardTheme: 'light', isActive: true },
        { name: 'Accessories', actionText: 'Shop all models →', link: '/accessories', image: 'https://i3-prod-assets.indiaistore.com/files/uploads/categories/beats-by-dr-dre/home-img-1725349599_8443.jpg', cardTheme: 'dark', isActive: true },
        { name: 'AppleCare+', actionText: 'Explore coverage →', link: '/applecare', image: '/applecare_official_hero.png', cardTheme: 'dark', isActive: true },
        { name: 'New Arrivals', actionText: 'Explore latest releases →', link: '/shop?sort=newest', image: '', cardTheme: 'dark', isActive: true },
      ];
      await settings.save();
    }

    if (!settings.navbarMenuItems || settings.navbarMenuItems.length === 0) {
      settings.navbarMenuItems = [
        {
          name: 'New Arrivals',
          link: '/shop?sort=newest',
          isActive: true,
          dropdownItems: [
            { label: 'Explore New Arrivals', path: '/shop?sort=newest', query: 'New Arrivals', image: '/iphone_category_v2.jpg', price: 'New Releases', isActive: true },
            { label: 'iPhone 17 Series', path: '/iphone', query: 'iPhone 17', image: '/iphone17p_orange.jpg', price: 'From ₹79,900', isActive: true },
            { label: 'MacBook M4 Series', path: '/macbook', query: 'MacBook Pro', image: '/mac_nav/macbook_pro.png', price: 'From ₹1,69,900', isActive: true },
            { label: 'Apple Watch Series 10', path: '/watch', query: 'Series 10', image: '/watch_category_uploaded.png', price: 'From ₹46,900', isActive: true },
          ]
        },
        {
          name: 'Mac',
          link: '/macbook',
          isActive: true,
          dropdownItems: [
            { label: 'Explore All Mac', path: '/macbook', query: 'MacBook', image: '/macbook_category_v3.jpg', price: 'Mac Workstations', isActive: true },
            { label: 'MacBook Neo', path: '/macbook?search=MacBook Neo', query: 'MacBook Neo', image: '/mac_dark_banner.jpg', price: 'High Performance Laptop', isActive: true },
            { label: 'MacBook Air', path: '/macbook?search=MacBook Air', query: 'MacBook Air', image: '/student_mac_banner.jpg', price: 'Light & Powerful. From ₹1,14,900', isActive: true },
            { label: 'MacBook Pro', path: '/macbook?search=MacBook Pro', query: 'MacBook Pro', image: '/mac_nav/macbook_pro.png', price: 'Pro Workflow Leader. From ₹1,69,900', isActive: true },
            { label: 'iMac', path: '/macbook?search=iMac', query: 'iMac', image: '/imac_studio_lifestyle.jpg', price: 'All-in-one Desktop. From ₹1,29,900', isActive: true },
            { label: 'Mac Mini', path: '/macbook?search=Mac Mini', query: 'Mac Mini', image: 'https://i3-prod-assets.indiaistore.com/files/uploads/products/mac-mini/mac-mini-m4-silver.png', price: 'Compact Powerhouse. From ₹54,900', isActive: true },
            { label: 'Mac Studio', path: '/macbook?search=Mac Studio', query: 'Mac Studio', image: '/mac_nav/mac_studio.png', price: 'Creator Station. From ₹1,99,900', isActive: true },
            { label: 'Displays', path: '/macbook?search=Studio Display', query: 'Display', image: '/mac_nav/mac_displays.png', price: 'Retina 5K & 6K Panels', isActive: true },
            { label: 'AppleCare+', path: '/applecare', query: 'AppleCare+', image: '/applecare_official_hero.png', price: 'Official Apple Warranty', isActive: true }
          ]
        },
        {
          name: 'iPad',
          link: '/ipad',
          isActive: true,
          dropdownItems: [
            { label: 'Explore All iPad', path: '/ipad', query: 'iPad', image: '/ipad_category_v3.png', price: 'iPad Catalogue', isActive: true },
            { label: 'iPad Pro', path: '/ipad?search=iPad Pro', query: 'iPad Pro', image: '/ipad_category_v2.jpg', price: 'Ultra Thin. From ₹99,900', isActive: true },
            { label: 'iPad Air', path: '/ipad?search=iPad Air', query: 'iPad Air', image: '/ipad_air_banner.jpg', price: 'Value & Power. From ₹59,900', isActive: true },
            { label: 'iPad', path: '/ipad?search=iPad', query: 'iPad', image: '/ipad_category.jpg', price: 'Daily Workhorse. From ₹34,900', isActive: true },
            { label: 'iPad mini', path: '/ipad?search=iPad mini', query: 'iPad mini', image: '/ipad_air_blue.jpg', price: 'Pocket Sized. From ₹49,900', isActive: true },
            { label: 'Apple Pencil', path: '/accessories?search=Pencil', query: 'Pencil', image: '/accessories_banner.png', price: 'Precision Input. From ₹11,900', isActive: true },
            { label: 'Keyboards', path: '/accessories?search=Keyboard', query: 'Keyboard', image: '/accessories_banner.png', price: 'Magic Keyboard', isActive: true },
            { label: 'Compare iPad', path: '/compare?category=ipad', query: 'Compare', image: '/ipad_category_v3.png', price: 'Compare Specs', isActive: true }
          ]
        },
        {
          name: 'iPhone',
          link: '/iphone',
          isActive: true,
          dropdownItems: [
            { label: 'Explore All iPhone', path: '/iphone', query: 'iPhone', image: '/iphone_category_v2.jpg', price: 'iPhone Catalogue', isActive: true },
            { label: 'iPhone 17 Pro Max', path: '/iphone?search=iPhone 17 Pro Max', query: 'iPhone 17 Pro Max', image: '/iphone17p_orange.jpg', price: 'Peak Performance. From ₹1,64,900', isActive: true },
            { label: 'iPhone 17 Pro', path: '/iphone?search=iPhone 17 Pro', query: 'iPhone 17 Pro', image: '/iphone17p_white.jpg', price: 'Titanium Build. From ₹1,34,900', isActive: true },
            { label: 'iPhone 17 Air', path: '/iphone?search=iPhone 17 Air', query: 'iPhone 17 Air', image: '/iphone17_green.jpg', price: 'Ultra Thin Design', isActive: true },
            { label: 'iPhone 17', path: '/iphone?search=iPhone 17', query: 'iPhone 17', image: '/iphone17_green.jpg', price: 'Sleek & Durable. From ₹79,900', isActive: true },
            { label: 'iPhone 17e', path: '/iphone?search=iPhone 17e', query: 'iPhone 17e', image: '/iphone17_green.jpg', price: 'Essential Performance', isActive: true },
            { label: 'iPhone 16', path: '/iphone?search=iPhone 16', query: 'iPhone 16', image: '/iphone_category_uploaded.jpg', price: 'Proven Classic. From ₹69,900', isActive: true },
            { label: 'Compare iPhone', path: '/compare?category=iphone', query: 'Compare', image: '/iphone_category_v2.jpg', price: 'Compare Specs', isActive: true }
          ]
        },
        {
          name: 'Watch',
          link: '/watch',
          isActive: true,
          dropdownItems: [
            { label: 'Explore All Watch', path: '/watch', query: 'Watch', image: '/watch_category_uploaded.png', price: 'Watch Lineup', isActive: true },
            { label: 'Apple Watch Series 10', path: '/watch?search=Series 10', query: 'Series 10', image: '/watch_category_uploaded.png', price: 'Thinnest Watch. From ₹46,900', isActive: true },
            { label: 'Apple Watch Ultra 2', path: '/watch?search=Ultra', query: 'Ultra', image: '/watch_category_uploaded.png', price: 'Extreme Sports. From ₹89,900', isActive: true },
            { label: 'Apple Watch SE', path: '/watch?search=SE', query: 'SE', image: '/watch_category_uploaded.png', price: 'Essential Health. From ₹24,900', isActive: true },
            { label: 'Compare Watch', path: '/compare?category=watch', query: 'Compare', image: '/watch_category_uploaded.png', price: 'Compare Specs', isActive: true }
          ]
        },
        {
          name: 'AirPods',
          link: '/airpods',
          isActive: true,
          dropdownItems: [
            { label: 'Explore All AirPods', path: '/airpods', query: 'AirPods', image: '/airpods_category_uploaded.png', price: 'AirPods Lineup', isActive: true },
            { label: 'AirPods Pro 2', path: '/airpods?search=Pro', query: 'AirPods Pro', image: '/airpods_category_uploaded.png', price: 'ANC Leader. From ₹24,900', isActive: true },
            { label: 'AirPods 4', path: '/airpods?search=AirPods 4', query: 'AirPods 4', image: '/airpods_category_uploaded.png', price: 'Open Ear ANC. From ₹12,900', isActive: true },
            { label: 'AirPods Max', path: '/airpods?search=Max', query: 'AirPods Max', image: '/airpods_category_uploaded.png', price: 'Over Ear Audio. From ₹59,900', isActive: true }
          ]
        },
        {
          name: 'TV & Home',
          link: '/tv-home',
          isActive: true,
          dropdownItems: [
            { label: 'Explore All TV & Home', path: '/tv-home', query: 'TV & Home', image: '/tvhome_category_uploaded.png', price: 'Cinematic Experience', isActive: true },
            { label: 'Apple TV 4K', path: '/tv-home?search=Apple TV', query: 'Apple TV', image: '/tvhome_category_uploaded.png', price: '4K HDR Cinema. From ₹14,900', isActive: true },
            { label: 'HomePod', path: '/tv-home?search=HomePod', query: 'HomePod', image: '/tvhome_category_uploaded.png', price: 'High Fidelity Sound. From ₹32,900', isActive: true },
            { label: 'HomePod mini', path: '/tv-home?search=HomePod mini', query: 'HomePod mini', image: '/tvhome_category_uploaded.png', price: 'Room filling audio. From ₹10,900', isActive: true }
          ]
        },
        {
          name: 'Accessories',
          link: '/accessories',
          isActive: true,
          dropdownItems: [
            { label: 'Explore All Accessories', path: '/accessories', query: 'Accessories', image: '/accessories_category_uploaded.png', price: 'Cables, cases & chargers', isActive: true },
            { label: 'Mac Accessories', path: '/accessories?product=mac', query: 'Mac', image: '/accessories_category_uploaded.png', price: 'Keyboards, Mice & Docks', isActive: true },
            { label: 'iPad Accessories', path: '/accessories?product=ipad', query: 'iPad', image: '/ipad_nav/dropdown_ipad_accessories.jpg', price: 'Pencils & Folios', isActive: true },
            { label: 'iPhone Accessories', path: '/accessories?product=iphone', query: 'iPhone', image: '/iphone_nav/dropdown_iphone_accessories.png', price: 'MagSafe & Cases', isActive: true },
            { label: 'Apple Watch Accessories', path: '/accessories?product=watch', query: 'Watch', image: '/watch_category_uploaded.png', price: 'Bands & Chargers', isActive: true },
            { label: 'AirPods Accessories', path: '/accessories?product=airpods', query: 'AirPods', image: '/airpods_category_uploaded.png', price: 'Cases & Lanyards', isActive: true },
            { label: 'TV & Home Accessories', path: '/accessories?product=tv-home', query: 'TV & Home', image: '/tvhome_category_uploaded.png', price: 'Remotes & Mounts', isActive: true }
          ]
        },
        {
          name: 'AppleCare+',
          link: '/applecare',
          isActive: true,
          dropdownItems: [
            { label: 'Explore AppleCare+', path: '/applecare', query: 'AppleCare', image: '/applecare_official_hero.png', price: 'Official Warranty Protection', isActive: true },
            { label: 'AppleCare+ for Mac', path: '/applecare', query: 'Mac', image: '/applecare_official_hero.png', price: '3-Year Protection Plan', isActive: true },
            { label: 'AppleCare+ for iPhone', path: '/applecare', query: 'iPhone', image: '/applecare_official_hero.png', price: 'Accidental Damage Protection', isActive: true },
            { label: 'AppleCare+ for iPad', path: '/applecare', query: 'iPad', image: '/applecare_official_hero.png', price: 'Hardware & Battery Coverage', isActive: true }
          ]
        }
      ];
      await settings.save();
    }

    // Ensure Accessories has dropdownItems if it exists and has 0 sub-items
    if (settings.navbarMenuItems && settings.navbarMenuItems.length > 0) {
      const accItem = settings.navbarMenuItems.find(i => (i.name || '').toLowerCase().includes('accessori'));
      if (accItem && (!accItem.dropdownItems || accItem.dropdownItems.length === 0)) {
        accItem.dropdownItems = [
          { label: 'Explore All Accessories', path: '/accessories', query: 'Accessories', image: '/accessories_category_uploaded.png', price: 'Cables, cases & chargers', isActive: true },
          { label: 'Mac Accessories', path: '/accessories?product=mac', query: 'Mac', image: '/accessories_category_uploaded.png', price: 'Keyboards, Mice & Docks', isActive: true },
          { label: 'iPad Accessories', path: '/accessories?product=ipad', query: 'iPad', image: '/ipad_nav/dropdown_ipad_accessories.jpg', price: 'Pencils & Folios', isActive: true },
          { label: 'iPhone Accessories', path: '/accessories?product=iphone', query: 'iPhone', image: '/iphone_nav/dropdown_iphone_accessories.png', price: 'MagSafe & Cases', isActive: true },
          { label: 'Apple Watch Accessories', path: '/accessories?product=watch', query: 'Watch', image: '/watch_category_uploaded.png', price: 'Bands & Chargers', isActive: true },
          { label: 'AirPods Accessories', path: '/accessories?product=airpods', query: 'AirPods', image: '/airpods_category_uploaded.png', price: 'Cases & Lanyards', isActive: true },
          { label: 'TV & Home Accessories', path: '/accessories?product=tv-home', query: 'TV & Home', image: '/tvhome_category_uploaded.png', price: 'Remotes & Mounts', isActive: true }
        ];
        await settings.save();
      }
    }

    if (!settings.footerSections || settings.footerSections.length === 0) {
      settings.footerSections = [
        {
          title: 'SHOP',
          isActive: true,
          links: [
            { label: 'Mac', url: '/macbook', isActive: true },
            { label: 'iPhone', url: '/iphone', isActive: true },
            { label: 'iPad', url: '/ipad', isActive: true },
            { label: 'Watch', url: '/watch', isActive: true },
            { label: 'AirPods', url: '/airpods', isActive: true },
            { label: 'TV & Home', url: '/tv-home', isActive: true },
            { label: 'Accessories', url: '/accessories', isActive: true },
            { label: 'AppleCare+', url: '/applecare', isActive: true },
          ]
        },
        {
          title: 'BUSINESS',
          isActive: true,
          links: [
            { label: 'Request a Quote', url: '/bulk-orders', isActive: true },
            { label: 'Bulk Pricing', url: '/bulk-orders', isActive: true },
            { label: 'Dealer Login', url: '/login', isActive: true },
            { label: 'GST Invoicing', url: '/bulk-orders', isActive: true },
          ]
        },
        {
          title: 'COMPANY',
          isActive: true,
          links: [
            { label: 'About iincept', url: '/about', isActive: true },
            { label: 'Contact Us', url: '/contact', isActive: true },
            { label: 'FAQ', url: '/faq', isActive: true },
          ]
        },
        {
          title: 'POLICIES',
          isActive: true,
          links: [
            { label: 'Shipping Policy', url: '/shipping-policy', isActive: true },
            { label: 'Returns & Refund Policy', url: '/returns-refund-policy', isActive: true },
            { label: 'Privacy Policy', url: '/privacy-policy', isActive: true },
            { label: 'Terms of Service', url: '/terms-of-service', isActive: true },
          ]
        }
      ];
      await settings.save();
    }

    if (!settings.appleCarePlans || settings.appleCarePlans.length === 0) {
      settings.appleCarePlans = [
        {
          categoryKey: 'mac',
          title: 'AppleCare+ for Mac',
          subtitle: '3 Years of global technical support and accidental damage protection',
          price: 14900,
          priceDisplay: '₹14,900.00',
          image: '/applecare_official_hero.png',
          features: [
            'Unlimited accidental damage protection',
            'Battery service if capacity drops below 80%',
            '24/7 priority access to Apple technical experts',
            'Global repair & hardware replacement coverage'
          ],
          isActive: true
        },
        {
          categoryKey: 'iphone',
          title: 'AppleCare+ for iPhone',
          subtitle: 'Comprehensive hardware protection & theft coverage',
          price: 7900,
          priceDisplay: '₹7,900.00',
          image: '/applecare_official_hero.png',
          features: [
            'Unlimited accidental damage claims',
            'Certified genuine Apple replacement parts',
            'Express replacement service shipped to your door',
            'Battery replacement service'
          ],
          isActive: true
        },
        {
          categoryKey: 'ipad',
          title: 'AppleCare+ for iPad',
          subtitle: 'Complete protection for your iPad, Apple Pencil & Magic Keyboard',
          price: 4900,
          priceDisplay: '₹4,900.00',
          image: '/applecare_official_hero.png',
          features: [
            'Coverage for iPad, Apple Pencil & Magic Keyboard',
            'Unlimited accidental damage protection',
            'Battery service coverage',
            '24/7 priority technical support'
          ],
          isActive: true
        },
        {
          categoryKey: 'watch',
          title: 'AppleCare+ for Apple Watch',
          subtitle: '2 Years of coverage and express replacement service',
          price: 2900,
          priceDisplay: '₹2,900.00',
          image: '/applecare_official_hero.png',
          features: [
            'Unlimited accidental damage claims',
            'Express replacement service',
            'Battery replacement service',
            '24/7 priority support'
          ],
          isActive: true
        },
        {
          categoryKey: 'airpods',
          title: 'AppleCare+ for Headphones & AirPods',
          subtitle: '2 Years of coverage for AirPods and AirPods Max',
          price: 2900,
          priceDisplay: '₹2,900.00',
          image: '/applecare_official_hero.png',
          features: [
            'Coverage for AirPods & Charging Case',
            'Battery replacement service',
            'Unlimited damage protection',
            'Apple expert support'
          ],
          isActive: true
        },
        {
          categoryKey: 'tv-home',
          title: 'AppleCare+ for Apple TV & HomePod',
          subtitle: '3 Years of protection for Apple TV, Siri Remote and HomePod',
          price: 2900,
          priceDisplay: '₹2,900.00',
          image: '/applecare_official_hero.png',
          features: [
            'Coverage for Apple TV & Siri Remote',
            'Global repair service',
            'Technical support'
          ],
          isActive: true
        }
      ];
      await settings.save();
    }

    // Seed appleCarePricingTables defaults if not set
    if (!settings.appleCarePricingTables || settings.appleCarePricingTables.length === 0) {
      settings.appleCarePricingTables = [
        {
          categoryKey: 'mac',
          image: '/macbook_category_v3.jpg',
          headline: 'Cover your Mac.',
          subheadline: 'AppleCare+ for Mac provides up to 3 years of expert support and hardware coverage.',
          durationLabel: '3 years',
          isActive: true,
          rows: [
            { model: 'Mac mini', title: 'AppleCare+ for Mac mini', description: '3 Years Apple-certified coverage for Mac mini', sku: 'AC-MAC-MINI', mrp: '₹14,900.00', discount: '13% OFF', salePrice: '₹12,900.00', monthly: '₹429.00', yearly: '₹12,900.00', isActive: true, image: 'https://www.apple.com/assets-www/en_WW/mac/04_chapternav/small/nav_mac_mini_f628f615d_2x.png' },
            { model: 'Mac Studio', title: 'AppleCare+ for Mac Studio', description: '3 Years Apple-certified coverage for Mac Studio', sku: 'AC-MAC-STUDIO', mrp: '₹22,900.00', discount: '13% OFF', salePrice: '₹19,900.00', monthly: '₹679.00', yearly: '₹19,900.00', isActive: true, image: '/mac_nav/mac_studio.png' },
            { model: 'iMac', title: 'AppleCare+ for iMac', description: '3 Years Apple-certified coverage for iMac', sku: 'AC-IMAC-24', mrp: '₹22,900.00', discount: '13% OFF', salePrice: '₹19,900.00', monthly: '₹679.00', yearly: '₹19,900.00', isActive: true, image: '/mac_nav/imac.png' },
            { model: 'Macbook Neo', title: 'AppleCare+ for Macbook Neo', description: '3 Years Apple-certified coverage for Macbook Neo', sku: 'AC-MACBOOK-NEO', mrp: '₹18,900.00', discount: '11% OFF', salePrice: '₹16,900.00', monthly: '₹579.00', yearly: '₹16,900.00', isActive: true, image: '/mac_nav/macbook_neo.png' },
            { model: 'MacBook Air 13″', title: 'AppleCare+ for MacBook Air 13″', description: '3 Years Apple-certified coverage for MacBook Air 13″', sku: 'AC-MBA-13', mrp: '₹25,900.00', discount: '12% OFF', salePrice: '₹22,900.00', monthly: '₹779.00', yearly: '₹22,900.00', isActive: true, image: '/mac_nav/macbook_air.png' },
            { model: 'MacBook Air 15″', title: 'AppleCare+ for MacBook Air 15″', description: '3 Years Apple-certified coverage for MacBook Air 15″', sku: 'AC-MBA-15', mrp: '₹27,900.00', discount: '12% OFF', salePrice: '₹24,900.00', monthly: '₹849.00', yearly: '₹24,900.00', isActive: true, image: '/mac_nav/macbook_air.png' },
            { model: 'MacBook Pro 14″', title: 'AppleCare+ for MacBook Pro 14″', description: '3 Years Apple-certified coverage for MacBook Pro 14″', sku: 'AC-MBP-14', mrp: '₹33,900.00', discount: '12% OFF', salePrice: '₹29,900.00', monthly: '₹999.00', yearly: '₹29,900.00', isActive: true, image: '/mac_nav/macbook_pro.png' },
            { model: 'MacBook Pro 16″', title: 'AppleCare+ for MacBook Pro 16″', description: '3 Years Apple-certified coverage for MacBook Pro 16″', sku: 'AC-MBP-16', mrp: '₹45,900.00', discount: '11% OFF', salePrice: '₹40,900.00', monthly: '₹1,379.00', yearly: '₹40,900.00', isActive: true, image: '/mac_nav/macbook_pro.png' },
            { model: 'Mac Pro', title: 'AppleCare+ for Mac Pro', description: '3 Years Apple-certified coverage for Mac Pro', sku: 'AC-MAC-PRO', mrp: '₹55,900.00', discount: '11% OFF', salePrice: '₹49,900.00', monthly: '₹1,699.00', yearly: '₹49,900.00', isActive: true, image: '/mac_nav/mac_studio.png' }
          ]
        },
        {
          categoryKey: 'iphone',
          image: '/iphone_category_v2.jpg',
          headline: 'Cover your iPhone.',
          subheadline: 'AppleCare+ for iPhone includes unlimited incidents of accidental damage protection.',
          durationLabel: '2 years',
          isActive: true,
          rows: [
            {
              model: 'iPhone 17e',
              title: 'AppleCare+ for iPhone 17e',
              description: '2 Years Apple-certified coverage for iPhone 17e',
              sku: 'SCYW3HN/A',
              mrp: '₹14,900.00',
              discount: '18%',
              salePrice: '11,900.00',
              monthly: '₹599.00',
              yearly: '11,900.00',
              planType: 'APPLE CARE+ • 2 YEAR PLAN',
              duration: '2 Years',
              image: '',
              isActive: true
            },
            {
              model: 'iPhone 17, iPhone 16',
              title: 'AppleCare+ for iPhone 17',
              description: '2 Years Apple-certified coverage for iPhone 17, iPhone 16',
              sku: 'SX2V2HN/A',
              mrp: '₹27,900.00',
              discount: '18%',
              salePrice: '22,900.00',
              monthly: '₹749.00',
              yearly: '14,900.00',
              planType: 'APPLE CARE+ • 2 YEAR PLAN',
              duration: '2 Years',
              image: '',
              isActive: true
            },
            {
              model: 'iPhone 16 Plus',
              title: 'AppleCare+ for iPhone 16 Plus',
              description: '2 Years Apple-certified coverage for iPhone 16 Plus',
              sku: 'SX3V2HN/A',
              mrp: '₹21,900.00',
              discount: '18%',
              salePrice: '17,900.00',
              monthly: '₹899.00',
              yearly: '17,900.00',
              planType: 'APPLE CARE+ • 2 YEAR PLAN',
              duration: '2 Years',
              image: '',
              isActive: true
            },
            {
              model: 'iPhone Air, iPhone 17 Pro, iPhone 17 Pro Max',
              title: 'AppleCare+ for iPhone 17 Pro',
              description: '2 Years Apple-certified coverage for iPhone Air, 17 Pro & 17 Pro Max',
              sku: 'SX4V2HN/A',
              mrp: '₹25,900.00',
              discount: '19%',
              salePrice: '20,900.00',
              monthly: '₹1,049.00',
              yearly: '20,900.00',
              planType: 'APPLE CARE+ • 2 YEAR PLAN',
              duration: '2 Years',
              image: '',
              isActive: true
            }
          ]
        },
        {
          categoryKey: 'ipad',
          image: '/ipad_category_v3.png',
          headline: 'Cover your iPad.',
          subheadline: 'AppleCare+ for iPad covers your iPad, Apple Pencil, and Apple-branded keyboards.',
          durationLabel: '2 years',
          isActive: true,
          rows: [
            { model: 'iPad, iPad mini', monthly: '₹449.00', yearly: '₹8,900.00', isActive: true },
            { model: 'iPad Air 11″', monthly: '₹499.00', yearly: '₹9,900.00', isActive: true },
            { model: 'iPad Air 13″', monthly: '₹599.00', yearly: '₹11,900.00', isActive: true },
            { model: 'iPad Pro 11″', monthly: '₹899.00', yearly: '₹17,900.00', isActive: true },
            { model: 'iPad Pro 13″', monthly: '₹999.00', yearly: '₹19,900.00', isActive: true }
          ]
        },
        {
          categoryKey: 'watch',
          image: '/watch_category.jpg',
          headline: 'Cover your Apple Watch.',
          subheadline: 'AppleCare+ for Apple Watch provides 2 years of accidental damage protection.',
          durationLabel: '2 years',
          isActive: true,
          rows: [
            { model: 'Apple Watch SE', monthly: '₹249.00', yearly: '₹4,900.00', isActive: true },
            { model: 'Apple Watch Series 11', monthly: '₹399.00', yearly: '₹7,900.00', isActive: true },
            { model: 'Apple Watch Ultra 3', monthly: '₹499.00', yearly: '₹9,900.00', isActive: true }
          ]
        },
        {
          categoryKey: 'airpods',
          image: '/airpods_category.jpg',
          headline: 'Cover your headphones.',
          subheadline: 'AppleCare+ for Headphones covers AirPods Pro, AirPods Max and Beats.',
          durationLabel: '2 years',
          isActive: true,
          rows: [
            { model: 'AirPods 4, Beats', monthly: '₹149.00', yearly: '₹2,900.00', isActive: true },
            { model: 'AirPods Pro 3', monthly: '₹249.00', yearly: '₹4,900.00', isActive: true },
            { model: 'AirPods Max 2', monthly: '₹349.00', yearly: '₹6,900.00', isActive: true }
          ]
        },
        {
          categoryKey: 'tv-home',
          image: '/applecare_official_hero.png',
          headline: 'Cover your Apple TV.',
          subheadline: 'AppleCare+ for Apple TV and HomePod includes 3 years of hardware support.',
          durationLabel: '3 years',
          isActive: true,
          rows: [
            { model: 'Apple TV', monthly: '₹99.00', yearly: '₹2,900.00', isActive: true },
            { model: 'HomePod mini', monthly: '₹79.00', yearly: '₹1,600.00', isActive: true },
            { model: 'HomePod', monthly: '₹199.00', yearly: '₹3,900.00', isActive: true }
          ]
        }
      ];
      await settings.save();
    } else if (settings.appleCarePricingTables && settings.appleCarePricingTables.length > 0) {
      const macTbl = settings.appleCarePricingTables.find(t => t.categoryKey === 'mac');
      if (macTbl && macTbl.rows) {
        const hasNeo = macTbl.rows.some(r => (r.model || '').toLowerCase().includes('neo'));
        if (!hasNeo) {
          macTbl.rows.splice(3, 0, { model: 'Macbook Neo', monthly: '₹579.00', yearly: '₹16,900.00', isActive: true, image: '/mac_nav/macbook_neo.png' });
          await settings.save();
        }
      }
    }

    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update site settings (Admin only)
const updateSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting({});
    }

    if (!settings.testimonials || settings.testimonials.length === 0) {
      settings.testimonials = [
        {
          stars: 5,
          text: '"Procured 40 MacBooks for our new office in 3 days, GST invoice sorted same week."',
          author: '— IT Head, Fintech firm',
          location: 'Bengaluru',
          sub: 'Bengaluru',
          isActive: true
        },
        {
          stars: 5,
          text: '"Our gifting desk orders AirPods every quarter — consolidated billing makes finance happy."',
          author: '— Procurement Lead, D2C brand',
          location: 'Mumbai',
          sub: 'Mumbai',
          isActive: true
        },
        {
          stars: 5,
          text: '"Quote turnaround was faster than two other resellers we checked."',
          author: '— Ops Manager, Consulting firm',
          location: 'Delhi NCR',
          sub: 'Delhi NCR',
          isActive: true
        },
        {
          stars: 5,
          text: '"Reliable for repeat bulk orders, delivered to three city offices without issue."',
          author: '— Admin Head, BPO',
          location: 'Pune',
          sub: 'Pune',
          isActive: true
        }
      ];
    }

    if (!settings.productAppleCare || !settings.productAppleCare.title) {
      settings.productAppleCare = {
        isEnabled: true,
        title: "Add AppleCare+",
        monthlyPriceText: "From ₹2817.00/mo.◊",
        mrpText: "or MRP ₹16900.00 (inclusive of all taxes)",
        features: [
          "Unlimited repairs for accidental damage protection‡",
          "Apple-certified repairs using genuine Apple parts",
          "{category}, battery and included accessories covered",
          "Priority access to Apple experts"
        ],
        categoryPrices: [
          { categoryName: "Mac", monthlyPrice: "From ₹2817.00/mo.◊", mrpPrice: "or MRP ₹16900.00 (inclusive of all taxes)" },
          { categoryName: "iPhone", monthlyPrice: "From ₹1483.00/mo.◊", mrpPrice: "or MRP ₹8900.00 (inclusive of all taxes)" },
          { categoryName: "iPad", monthlyPrice: "From ₹1150.00/mo.◊", mrpPrice: "or MRP ₹6900.00 (inclusive of all taxes)" },
          { categoryName: "Watch", monthlyPrice: "From ₹750.00/mo.◊", mrpPrice: "or MRP ₹4500.00 (inclusive of all taxes)" },
          { categoryName: "AirPods", monthlyPrice: "From ₹483.00/mo.◊", mrpPrice: "or MRP ₹2900.00 (inclusive of all taxes)" }
        ]
      };
      await settings.save();
    }

    const {
      logo,
      businessEmail,
      businessPhone,
      supportHours,
      socialLinks,
      homeHeroBadge,
      homeHeroTitle,
      homeHeroSubtitle,
      homeHeroPrimaryBtnText,
      homeHeroPrimaryBtnLink,
      homeHeroSecondaryBtnText,
      homeHeroSecondaryBtnLink,
      homeHeroImage,
      homeCategoryIcons,
      homeNewArrivals,
      heroTitle1,
      heroSubtitle1,
      heroButtonText1,
      heroTitle2,
      heroSubtitle2,
      heroButtonText2,
      heroTitle3,
      heroSubtitle3,
      heroButtonText3,
      heroTitle4,
      heroSubtitle4,
      heroButtonText4,
      heroSlides,
      appleCategories,
      testimonials,
      navbarMenuItems,
      categoryIconGroups,
      appleCarePlans,
      appleCarePricingTables,
      productAppleCare,
      footerSections,
      featuredProductIds,
      shippingCharge,
      taxPercentage,
      freeShippingThreshold,
      announcement,
      announcementBold,
      announcementNormal,
      dealEyebrow,
      dealTitle,
      dealDesc,
      dealPrice,
      dealOldPrice,
      dealButtonText,
      dealButtonLink,
      dealImage,
    } = req.body;

    if (logo !== undefined) settings.logo = logo;
    if (businessEmail !== undefined) settings.businessEmail = businessEmail;
    if (businessPhone !== undefined) settings.businessPhone = businessPhone;
    if (supportHours !== undefined) settings.supportHours = supportHours;
    if (socialLinks !== undefined) settings.socialLinks = socialLinks;

    if (homeHeroBadge !== undefined) settings.homeHeroBadge = homeHeroBadge;
    if (homeHeroTitle !== undefined) settings.homeHeroTitle = homeHeroTitle;
    if (homeHeroSubtitle !== undefined) settings.homeHeroSubtitle = homeHeroSubtitle;
    if (homeHeroPrimaryBtnText !== undefined) settings.homeHeroPrimaryBtnText = homeHeroPrimaryBtnText;
    if (homeHeroPrimaryBtnLink !== undefined) settings.homeHeroPrimaryBtnLink = homeHeroPrimaryBtnLink;
    if (homeHeroSecondaryBtnText !== undefined) settings.homeHeroSecondaryBtnText = homeHeroSecondaryBtnText;
    if (homeHeroSecondaryBtnLink !== undefined) settings.homeHeroSecondaryBtnLink = homeHeroSecondaryBtnLink;
    if (homeHeroImage !== undefined) settings.homeHeroImage = homeHeroImage;
    if (homeCategoryIcons !== undefined) settings.homeCategoryIcons = homeCategoryIcons;
    if (homeNewArrivals !== undefined) {
      settings.homeNewArrivals = homeNewArrivals;
      settings.markModified('homeNewArrivals');
    }

    if (dealEyebrow !== undefined) settings.dealEyebrow = dealEyebrow;
    if (dealTitle !== undefined) settings.dealTitle = dealTitle;
    if (dealDesc !== undefined) settings.dealDesc = dealDesc;
    if (dealPrice !== undefined) settings.dealPrice = dealPrice;
    if (dealOldPrice !== undefined) settings.dealOldPrice = dealOldPrice;
    if (dealButtonText !== undefined) settings.dealButtonText = dealButtonText;
    if (dealButtonLink !== undefined) settings.dealButtonLink = dealButtonLink;
    if (dealImage !== undefined) settings.dealImage = dealImage;

    if (req.body.homeDealBanners !== undefined) {
      settings.homeDealBanners = req.body.homeDealBanners;
      settings.markModified('homeDealBanners');
    }

    if (heroTitle1 !== undefined) settings.heroTitle1 = heroTitle1;
    if (heroSubtitle1 !== undefined) settings.heroSubtitle1 = heroSubtitle1;
    if (heroButtonText1 !== undefined) settings.heroButtonText1 = heroButtonText1;

    if (heroTitle2 !== undefined) settings.heroTitle2 = heroTitle2;
    if (heroSubtitle2 !== undefined) settings.heroSubtitle2 = heroSubtitle2;
    if (heroButtonText2 !== undefined) settings.heroButtonText2 = heroButtonText2;

    if (heroTitle3 !== undefined) settings.heroTitle3 = heroTitle3;
    if (heroSubtitle3 !== undefined) settings.heroSubtitle3 = heroSubtitle3;
    if (heroButtonText3 !== undefined) settings.heroButtonText3 = heroButtonText3;

    if (heroTitle4 !== undefined) settings.heroTitle4 = heroTitle4;
    if (heroSubtitle4 !== undefined) settings.heroSubtitle4 = heroSubtitle4;
    if (heroButtonText4 !== undefined) settings.heroButtonText4 = heroButtonText4;

    if (heroSlides !== undefined) {
      settings.heroSlides = heroSlides;
      settings.markModified('heroSlides');
    }
    if (appleCategories !== undefined) {
      settings.appleCategories = appleCategories.map(cat => ({
        ...cat,
        image: (cat.image || '').trim(),
        name: (cat.name || '').trim(),
        link: (cat.link || '').trim(),
      }));
    }
    if (testimonials !== undefined) settings.testimonials = testimonials;
    if (navbarMenuItems !== undefined) settings.navbarMenuItems = navbarMenuItems;
    if (categoryIconGroups !== undefined) settings.categoryIconGroups = categoryIconGroups;
    if (appleCarePlans !== undefined) settings.appleCarePlans = appleCarePlans;
    if (appleCarePricingTables !== undefined) {
      const calcPrice = (mrp, disc) => {
        const mrpNum = parseFloat(String(mrp || '').replace(/[^0-9.]/g, '')) || 0;
        const discNum = Math.min(100, Math.max(0, parseFloat(String(disc || '').replace(/[^0-9.]/g, '')) || 0));
        const finalNum = Math.max(0, Math.round(mrpNum - (mrpNum * discNum / 100)));
        return `₹${finalNum.toLocaleString('en-IN')}`;
      };

      settings.appleCarePricingTables = appleCarePricingTables.map(table => {
        if (!table.rows || !Array.isArray(table.rows)) return table;
        const updatedRows = table.rows.map(row => {
          const mrp1 = row.mrp1yr || '';
          const disc1 = row.discount1yr !== undefined && row.discount1yr !== null ? String(row.discount1yr) : '';
          const sale1 = row.salePrice1yr || (mrp1 ? calcPrice(mrp1, disc1) : '');

          const mrp2 = row.mrp2yr || row.mrp || '';
          const disc2 = row.discount2yr !== undefined && row.discount2yr !== null ? String(row.discount2yr) : (row.discount !== undefined ? String(row.discount) : '');
          const sale2 = row.salePrice2yr || row.salePrice || row.yearly || (mrp2 ? calcPrice(mrp2, disc2) : '');

          return {
            ...row,
            mrp1yr: mrp1,
            discount1yr: disc1,
            salePrice1yr: sale1,
            sku1yr: row.sku1yr || '',
            description1yr: row.description1yr || '',

            mrp2yr: mrp2,
            discount2yr: disc2,
            salePrice2yr: sale2,
            sku2yr: row.sku2yr || row.sku || '',
            description2yr: row.description2yr || row.description || '',

            mrp: mrp2,
            discount: disc2,
            salePrice: sale2,
            yearly: sale2,
            sku: row.sku2yr || row.sku || '',
            description: row.description2yr || row.description || ''
          };
        });
        return { ...table, rows: updatedRows };
      });
      settings.markModified('appleCarePricingTables');
    }
    if (productAppleCare !== undefined) settings.productAppleCare = productAppleCare;
    if (footerSections !== undefined) settings.footerSections = footerSections;

    if (featuredProductIds !== undefined) settings.featuredProductIds = featuredProductIds;
    if (shippingCharge !== undefined) settings.shippingCharge = Number(shippingCharge);
    if (taxPercentage !== undefined) settings.taxPercentage = Number(taxPercentage);
    if (freeShippingThreshold !== undefined) settings.freeShippingThreshold = Number(freeShippingThreshold);
    if (announcement !== undefined) settings.announcement = announcement;
    if (announcementBold !== undefined) settings.announcementBold = announcementBold;
    if (announcementNormal !== undefined) settings.announcementNormal = announcementNormal;

    await settings.save();
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
