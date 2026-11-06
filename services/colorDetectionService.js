const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const { resolveColorHex, isValidHex, normalizeHex } = require("../utils/colorResolver");

/**
 * Comprehensive Universal Color Reference Dictionary
 * Covers standard W3C colors, consumer electronics, tech finishes, apparel, and accessories.
 */
const COLOR_PALETTE = [
  // 1. Whites / Off-whites
  { name: "White", hex: "#FFFFFF", rgb: [255, 255, 255], family: "white" },
  { name: "Star White", hex: "#F8F9FA", rgb: [248, 249, 250], family: "white" },
  { name: "Ivory", hex: "#FFFFF0", rgb: [255, 255, 240], family: "white" },
  { name: "Cream", hex: "#FFFDD0", rgb: [255, 253, 208], family: "white" },
  { name: "Beige", hex: "#F5F5DC", rgb: [245, 245, 220], family: "beige" },
  { name: "Starlight", hex: "#F5F5F0", rgb: [245, 245, 240], family: "white" },
  { name: "White Titanium", hex: "#F2F1ED", rgb: [242, 241, 237], family: "white" },

  // 2. Grays / Silvers / Titanium
  { name: "Silver", hex: "#C0C0C0", rgb: [192, 192, 192], family: "silver" },
  { name: "Light Gray", hex: "#D3D3D3", rgb: [211, 211, 211], family: "gray" },
  { name: "Gray", hex: "#808080", rgb: [128, 128, 128], family: "gray" },
  { name: "Space Gray", hex: "#535150", rgb: [83, 81, 80], family: "gray" },
  { name: "Natural Titanium", hex: "#A39E99", rgb: [163, 158, 153], family: "gray" },
  { name: "Graphite", hex: "#4C4A46", rgb: [76, 74, 70], family: "gray" },
  { name: "Charcoal", hex: "#36454F", rgb: [54, 69, 79], family: "gray" },
  { name: "Dark Gray", hex: "#4A4A4A", rgb: [74, 74, 74], family: "gray" },

  // 3. Blacks / Dark Finishes
  { name: "Black", hex: "#000000", rgb: [15, 15, 15], family: "black" },
  { name: "Space Black", hex: "#1C1C1C", rgb: [28, 28, 28], family: "black" },
  { name: "Black Titanium", hex: "#232426", rgb: [35, 36, 38], family: "black" },
  { name: "Midnight", hex: "#191F26", rgb: [25, 31, 38], family: "black" },
  { name: "Jet Black", hex: "#0A0A0A", rgb: [10, 10, 10], family: "black" },

  // 4. Blues / Navy / Cyan
  { name: "Blue", hex: "#0071E3", rgb: [0, 113, 227], family: "blue" },
  { name: "Navy Blue", hex: "#000080", rgb: [0, 0, 128], family: "blue" },
  { name: "Dark Blue", hex: "#00008B", rgb: [0, 0, 139], family: "blue" },
  { name: "Sky Blue", hex: "#87CEEB", rgb: [135, 206, 235], family: "blue" },
  { name: "Light Blue", hex: "#ADD8E6", rgb: [173, 216, 230], family: "blue" },
  { name: "Ice Blue", hex: "#D8E8F5", rgb: [216, 232, 245], family: "blue" },
  { name: "Sierra Blue", hex: "#9BB5CE", rgb: [155, 181, 206], family: "blue" },
  { name: "Pacific Blue", hex: "#2D4E68", rgb: [45, 78, 104], family: "blue" },
  { name: "Ultramarine", hex: "#3F58A8", rgb: [63, 88, 168], family: "blue" },
  { name: "Cyan", hex: "#00FFFF", rgb: [0, 255, 255], family: "blue" },
  { name: "Teal", hex: "#008080", rgb: [0, 128, 128], family: "blue" },
  { name: "Turquoise", hex: "#40E0D0", rgb: [64, 224, 208], family: "blue" },

  // 5. Purples / Lavender
  { name: "Purple", hex: "#800080", rgb: [128, 0, 128], family: "purple" },
  { name: "Deep Purple", hex: "#3B224C", rgb: [59, 34, 76], family: "purple" },
  { name: "Violet", hex: "#8A2BE2", rgb: [138, 43, 226], family: "purple" },
  { name: "Lavender", hex: "#E6E6FA", rgb: [230, 230, 250], family: "purple" },
  { name: "Plum", hex: "#DDA0DD", rgb: [221, 160, 221], family: "purple" },

  // 6. Reds / Pinks / Rose
  { name: "Red", hex: "#E11C2A", rgb: [225, 28, 42], family: "red" },
  { name: "Product Red", hex: "#E11C2A", rgb: [225, 28, 42], family: "red" },
  { name: "Crimson", hex: "#DC143C", rgb: [220, 20, 60], family: "red" },
  { name: "Burgundy", hex: "#800020", rgb: [128, 0, 32], family: "red" },
  { name: "Maroon", hex: "#800000", rgb: [128, 0, 0], family: "red" },
  { name: "Pink", hex: "#FFC0CB", rgb: [255, 192, 203], family: "pink" },
  { name: "Rose Gold", hex: "#B76E79", rgb: [183, 110, 121], family: "pink" },
  { name: "Chalk Pink", hex: "#E8B4B8", rgb: [232, 180, 184], family: "pink" },
  { name: "Coral", hex: "#FF7F50", rgb: [255, 127, 80], family: "pink" },

  // 7. Oranges / Yellows / Gold
  { name: "Orange", hex: "#FFA500", rgb: [255, 165, 0], family: "orange" },
  { name: "Sunset Orange", hex: "#FD5E53", rgb: [253, 94, 83], family: "orange" },
  { name: "Peach", hex: "#FFDAB9", rgb: [255, 218, 185], family: "orange" },
  { name: "Yellow", hex: "#FFFF00", rgb: [255, 255, 0], family: "yellow" },
  { name: "Gold", hex: "#FFD700", rgb: [255, 215, 0], family: "yellow" },
  { name: "Desert Titanium", hex: "#D4BBA5", rgb: [212, 187, 165], family: "yellow" },
  { name: "Amber", hex: "#FFBF00", rgb: [255, 191, 0], family: "yellow" },

  // 8. Greens / Olive
  { name: "Green", hex: "#008000", rgb: [0, 128, 0], family: "green" },
  { name: "Alpine Green", hex: "#505C4E", rgb: [80, 92, 78], family: "green" },
  { name: "Forest Green", hex: "#228B22", rgb: [34, 139, 34], family: "green" },
  { name: "Olive", hex: "#808000", rgb: [128, 128, 0], family: "green" },
  { name: "Emerald", hex: "#50C878", rgb: [80, 200, 120], family: "green" },
  { name: "Mint", hex: "#98FF98", rgb: [152, 255, 152], family: "green" },

  // 9. Browns / Earth
  { name: "Brown", hex: "#8B4513", rgb: [139, 69, 19], family: "brown" },
  { name: "Saddle Brown", hex: "#8B4513", rgb: [139, 69, 19], family: "brown" },
  { name: "Tan", hex: "#D2B48C", rgb: [210, 180, 140], family: "brown" },
  { name: "Bronze", hex: "#CD7F32", rgb: [205, 127, 50], family: "brown" }
];

/**
 * Multi-word and single-word keywords for title scanning
 */
const TITLE_COLOR_KEYWORDS = [
  "space black", "space gray", "space grey", "jet black", "midnight",
  "natural titanium", "desert titanium", "black titanium", "white titanium",
  "sierra blue", "pacific blue", "alpine green", "deep purple", "product red",
  "rose gold", "chalk pink", "sunset orange", "sky blue", "ice blue",
  "navy blue", "dark blue", "forest green", "saddle brown", "light blue",
  "light gray", "dark gray", "star white", "ultramarine", "starlight",
  "silver", "black", "white", "gray", "grey", "gold", "blue", "green",
  "yellow", "orange", "purple", "red", "pink", "brown", "bronze", "charcoal",
  "graphite", "beige", "ivory", "cream", "lavender", "mint", "coral", "teal",
  "turquoise", "olive", "maroon", "burgundy", "cyan", "tan", "amber", "peach"
];

/**
 * Resolves an image path or URL to an in-memory Buffer.
 */
async function resolveImageBuffer(imagePathOrUrl) {
  if (!imagePathOrUrl || typeof imagePathOrUrl !== "string") {
    return null;
  }

  const clean = imagePathOrUrl.trim();
  if (!clean) return null;

  // 1. Check local uploads directories
  const localCandidates = [
    path.join(__dirname, "../uploads", path.basename(clean)),
    path.join(__dirname, "../../client/public/uploads", path.basename(clean)),
    path.join(__dirname, "../../client/dist/uploads", path.basename(clean)),
    path.join(__dirname, "../..", clean.replace(/^\//, ""))
  ];

  for (const candidate of localCandidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return fs.readFileSync(candidate);
      }
    } catch (e) {
      // Continue to next candidate
    }
  }

  // 2. Remote URL (http/https)
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    try {
      // If localhost, extract path
      if (clean.includes("localhost") || clean.includes("127.0.0.1")) {
        const urlObj = new URL(clean);
        const fileName = path.basename(urlObj.pathname);
        for (const candidate of localCandidates) {
          if (candidate.endsWith(fileName) && fs.existsSync(candidate)) {
            return fs.readFileSync(candidate);
          }
        }
      }

      const res = await fetch(clean, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        return Buffer.from(arrayBuf);
      }
    } catch (err) {
      console.warn(`[colorDetectionService] Failed to fetch remote image: ${clean}`, err.message);
    }
  }

  return null;
}

/**
 * Calculates perceptual Euclidean distance between two RGB colors.
 */
function getRgbDistance(rgb1, rgb2) {
  const rmean = (rgb1[0] + rgb2[0]) / 2;
  const r = rgb1[0] - rgb2[0];
  const g = rgb1[1] - rgb2[1];
  const b = rgb1[2] - rgb2[2];
  // Standard weighted color perception formula
  return Math.sqrt((((512 + rmean) * r * r) >> 8) + 4 * g * g + (((767 - rmean) * b * b) >> 8));
}

/**
 * Converts RGB to HSL.
 */
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * Analyzes a single image buffer and extracts the dominant foreground product color.
 */
async function analyzeImagePixels(imageBuffer) {
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
    return null;
  }

  try {
    // Resize down to 100x100 for fast, consistent pixel clustering
    const { data, info } = await sharp(imageBuffer)
      .resize(100, 100, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const totalPixels = info.width * info.height;
    if (totalPixels === 0) return null;

    // 1. Detect background from border pixels (outer 2 rows and columns)
    let borderR = 0, borderG = 0, borderB = 0, borderCount = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (x < 2 || x >= info.width - 2 || y < 2 || y >= info.height - 2) {
          const idx = (y * info.width + x) * 4;
          const a = data[idx + 3];
          if (a > 40) {
            borderR += data[idx];
            borderG += data[idx + 1];
            borderB += data[idx + 2];
            borderCount++;
          }
        }
      }
    }

    const bgR = borderCount > 0 ? Math.round(borderR / borderCount) : 255;
    const bgG = borderCount > 0 ? Math.round(borderG / borderCount) : 255;
    const bgB = borderCount > 0 ? Math.round(borderB / borderCount) : 255;

    // 2. Collect foreground pixels (excluding transparent, background, and studio drop shadows)
    const fgPixels = [];
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const idx = (y * info.width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        // Skip transparent
        if (a < 50) continue;

        // Skip pixels matching detected background (distance < 30)
        const dBg = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
        if (dBg < 28) continue;

        // Skip pure/near-white backgrounds (RGB all > 242)
        if (r > 242 && g > 242 && b > 242) continue;

        // Suppress drop shadows at the bottom 15% of the image (low saturation, mid-low luminance)
        if (y > info.height * 0.85) {
          const maxVal = Math.max(r, g, b);
          const minVal = Math.min(r, g, b);
          if (maxVal - minVal < 18 && maxVal < 200 && maxVal > 60) {
            continue;
          }
        }

        fgPixels.push([r, g, b]);
      }
    }

    // Fallback: If background subtraction eliminated too many pixels, sample center 50% box
    if (fgPixels.length < 100) {
      const startX = Math.floor(info.width * 0.25);
      const endX = Math.floor(info.width * 0.75);
      const startY = Math.floor(info.height * 0.25);
      const endY = Math.floor(info.height * 0.75);

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const idx = (y * info.width + x) * 4;
          const a = data[idx + 3];
          if (a >= 50) {
            fgPixels.push([data[idx], data[idx + 1], data[idx + 2]]);
          }
        }
      }
    }

    if (fgPixels.length === 0) {
      return null;
    }

    // 3. Color Quantization / Clustering (group similar colors into buckets)
    const colorBuckets = {};
    const BUCKET_STEP = 24; // 24-level quantization

    fgPixels.forEach(([r, g, b]) => {
      const qr = Math.floor(r / BUCKET_STEP) * BUCKET_STEP;
      const qg = Math.floor(g / BUCKET_STEP) * BUCKET_STEP;
      const qb = Math.floor(b / BUCKET_STEP) * BUCKET_STEP;
      const key = `${qr}_${qg}_${qb}`;
      if (!colorBuckets[key]) {
        colorBuckets[key] = { count: 0, rSum: 0, gSum: 0, bSum: 0 };
      }
      colorBuckets[key].count++;
      colorBuckets[key].rSum += r;
      colorBuckets[key].gSum += g;
      colorBuckets[key].bSum += b;
    });

    // Find dominant bucket(s)
    const sortedBuckets = Object.values(colorBuckets).sort((a, b) => b.count - a.count);
    const topBucket = sortedBuckets[0];

    const domR = Math.round(topBucket.rSum / topBucket.count);
    const domG = Math.round(topBucket.gSum / topBucket.count);
    const domB = Math.round(topBucket.bSum / topBucket.count);
    const domHex = ("#" + [domR, domG, domB].map(v => v.toString(16).padStart(2, "0")).join("")).toUpperCase();
    const hsl = rgbToHsl(domR, domG, domB);
    const foregroundRatio = fgPixels.length / totalPixels;
    const bucketDominance = topBucket.count / fgPixels.length;

    return {
      rgb: [domR, domG, domB],
      hex: domHex,
      hsl,
      foregroundRatio,
      bucketDominance,
      totalForegroundPixels: fgPixels.length
    };
  } catch (err) {
    console.error("[colorDetectionService] Image analysis error:", err.message);
    return null;
  }
}

/**
 * Extracts color candidates mentioned in the product title.
 */
function extractTitleColorCandidates(title) {
  if (!title || typeof title !== "string") return [];
  const lowerTitle = title.toLowerCase();
  const found = [];

  for (const kw of TITLE_COLOR_KEYWORDS) {
    // Word boundary check
    const regex = new RegExp(`\\b${kw.replace(/\s+/g, "\\s+")}\\b`, "i");
    if (regex.test(lowerTitle)) {
      // Find matching item in COLOR_PALETTE
      const match = COLOR_PALETTE.find(p => p.name.toLowerCase() === kw.toLowerCase()) || {
        name: kw.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        hex: resolveColorHex(kw),
        rgb: [128, 128, 128]
      };
      if (!found.some(f => f.name.toLowerCase() === match.name.toLowerCase())) {
        found.push(match);
      }
    }
  }

  return found;
}

/**
 * Matches an extracted image visual color against the color palette and title candidates.
 */
function matchColorWithKnowledgeBase(visualData, titleCandidates = []) {
  if (!visualData) {
    return null;
  }

  const { rgb, hex, hsl, foregroundRatio, bucketDominance } = visualData;
  const { h, s, l } = hsl;
  const maxRgb = Math.max(...rgb);
  const minRgb = Math.min(...rgb);
  const diffRgb = maxRgb - minRgb;
  const isAchromatic = s < 13 || diffRgb < 16;

  // 1. Cross-reference with Title Candidates First (Rule 5)
  for (const cand of titleCandidates) {
    const candName = cand.name.toLowerCase();

    // Achromatic Title Match
    if (isAchromatic) {
      if (candName.includes("white") && l >= 80) {
        return {
          name: cand.name,
          colorHex: cand.hex || "#FFFFFF",
          visualHex: hex,
          rgb,
          confidence: 0.98,
          isTitleMatch: true,
          reviewNeeded: false
        };
      }
      if ((candName.includes("black") || candName.includes("midnight")) && l <= 38) {
        return {
          name: cand.name,
          colorHex: cand.hex || "#1C1C1C",
          visualHex: hex,
          rgb,
          confidence: 0.98,
          isTitleMatch: true,
          reviewNeeded: false
        };
      }
      if ((candName.includes("space gray") || candName.includes("space grey") || candName.includes("graphite")) && l >= 25 && l <= 68) {
        return {
          name: cand.name,
          colorHex: cand.hex || "#535150",
          visualHex: hex,
          rgb,
          confidence: 0.98,
          isTitleMatch: true,
          reviewNeeded: false
        };
      }
      if ((candName.includes("silver") || candName.includes("starlight")) && l >= 65 && l <= 95) {
        return {
          name: cand.name,
          colorHex: cand.hex || "#C0C0C0",
          visualHex: hex,
          rgb,
          confidence: 0.98,
          isTitleMatch: true,
          reviewNeeded: false
        };
      }
      if (candName.includes("natural titanium") && l >= 40 && l <= 75) {
        return {
          name: cand.name,
          colorHex: cand.hex || "#A39E99",
          visualHex: hex,
          rgb,
          confidence: 0.98,
          isTitleMatch: true,
          reviewNeeded: false
        };
      }
    }

    // Chromatic Title Match
    if (!isAchromatic) {
      const candHex = cand.hex || resolveColorHex(cand.name);
      let candRgb = cand.rgb;
      if (!candRgb && candHex) {
        const cleanH = candHex.replace("#", "");
        candRgb = [
          parseInt(cleanH.slice(0, 2), 16),
          parseInt(cleanH.slice(2, 4), 16),
          parseInt(cleanH.slice(4, 6), 16)
        ];
      }
      if (candRgb) {
        const dist = getRgbDistance(rgb, candRgb);
        if (dist < 90) {
          return {
            name: cand.name,
            colorHex: candHex,
            visualHex: hex,
            rgb,
            confidence: Math.min(0.99, Math.max(0.88, 1 - (dist / 320))),
            isTitleMatch: true,
            reviewNeeded: false
          };
        }
      }
    }
  }

  // 2. Strict Achromatic Resolution if neutral (prevents false tinted matches)
  if (isAchromatic) {
    let achroName = "Silver";
    let achroHex = "#C0C0C0";

    if (l >= 92) {
      achroName = "White";
      achroHex = "#FFFFFF";
    } else if (l >= 70) {
      achroName = "Silver";
      achroHex = "#C0C0C0";
    } else if (l >= 40) {
      achroName = "Space Gray";
      achroHex = "#535150";
    } else if (l >= 18) {
      achroName = "Space Black";
      achroHex = "#1C1C1C";
    } else {
      achroName = "Black";
      achroHex = "#000000";
    }

    return {
      name: achroName,
      colorHex: achroHex,
      visualHex: hex,
      rgb,
      confidence: 0.95,
      isTitleMatch: false,
      reviewNeeded: false
    };
  }

  // 3. Match against full universal palette with perceptual distance & hue penalty
  let bestMatch = null;
  let minDistance = Infinity;

  for (const item of COLOR_PALETTE) {
    let dist = getRgbDistance(rgb, item.rgb);
    // Add penalty if hue divergence is large when both are saturated
    const itemHsl = rgbToHsl(item.rgb[0], item.rgb[1], item.rgb[2]);
    if (s > 20 && itemHsl.s > 20) {
      const hueDiff = Math.abs(h - itemHsl.h);
      const minHueDiff = Math.min(hueDiff, 360 - hueDiff);
      dist += minHueDiff * 0.45;
    }

    if (dist < minDistance) {
      minDistance = dist;
      bestMatch = item;
    }
  }

  if (!bestMatch) {
    return {
      name: "Custom",
      colorHex: hex,
      visualHex: hex,
      rgb,
      confidence: 0.60,
      isTitleMatch: false,
      reviewNeeded: true
    };
  }

  let confidence = Math.max(0.45, Math.min(0.96, 1 - (minDistance / 350)));
  if (bucketDominance > 0.40) confidence += 0.05;
  if (foregroundRatio < 0.08) confidence -= 0.15;

  const reviewNeeded = confidence < 0.70;

  return {
    name: bestMatch.name,
    colorHex: bestMatch.hex,
    visualHex: hex,
    rgb,
    confidence: Number(confidence.toFixed(2)),
    isTitleMatch: false,
    reviewNeeded
  };
}

/**
 * Main Detection Engine for a product:
 * Analyzes Product Name + All Uploaded Product Images.
 * Groups images by color, creates color variants, maps colorImages.
 */
async function detectProductColors(title, images = []) {
  const result = {
    detectedColors: [],
    colorImages: {},
    suggestedVariants: [],
    confidence: "high",
    scannedImagesCount: 0,
    validImagesCount: 0,
    reviewNeeded: false
  };

  if (!Array.isArray(images) || images.length === 0) {
    return result;
  }

  const titleCandidates = extractTitleColorCandidates(title);
  const targetImages = images.slice(0, 12);
  result.scannedImagesCount = targetImages.length;

  // Process images concurrently
  const analysisPromises = targetImages.map(async (imgUrl, idx) => {
    if (!imgUrl) return null;
    try {
      const buffer = await resolveImageBuffer(imgUrl);
      if (!buffer) return null;
      const visualData = await analyzeImagePixels(buffer);
      if (!visualData) return null;
      const match = matchColorWithKnowledgeBase(visualData, titleCandidates);
      if (!match) return null;
      return {
        imageUrl: imgUrl,
        imageIndex: idx,
        match,
        rgb: visualData.rgb,
        hex: visualData.hex
      };
    } catch (e) {
      return null;
    }
  });

  const rawResults = await Promise.all(analysisPromises);
  const perImageAnalysis = rawResults.filter(Boolean);
  result.validImagesCount = perImageAnalysis.length;

  if (perImageAnalysis.length === 0) {
    return result;
  }

  // Cluster images into distinct colors
  // Images with distance < 42 are treated as the same color (e.g. multi-angle shots of Silver)
  const colorGroups = [];

  for (const analysis of perImageAnalysis) {
    let existingGroup = null;

    // Check by color name or close RGB distance
    for (const group of colorGroups) {
      if (group.name.toLowerCase() === analysis.match.name.toLowerCase()) {
        existingGroup = group;
        break;
      }
      const dist = getRgbDistance(group.rgb, analysis.rgb);
      if (dist < 42) {
        existingGroup = group;
        break;
      }
    }

    if (existingGroup) {
      existingGroup.images.push(analysis.imageUrl);
      existingGroup.confidence = Math.min(0.99, existingGroup.confidence + 0.05);
    } else {
      colorGroups.push({
        name: analysis.match.name,
        colorHex: analysis.match.colorHex,
        rgb: analysis.rgb,
        image: analysis.imageUrl,
        images: [analysis.imageUrl],
        confidence: analysis.match.confidence,
        isTitleMatch: analysis.match.isTitleMatch,
        reviewNeeded: analysis.match.reviewNeeded
      });
    }
  }

  // Build detected colors output
  result.detectedColors = colorGroups.map(group => ({
    name: group.name,
    value: group.colorHex,
    colorHex: group.colorHex,
    image: group.image,
    images: group.images,
    confidence: Number(group.confidence.toFixed(2)),
    reviewNeeded: group.reviewNeeded
  }));

  // Build colorImages mapping
  colorGroups.forEach(group => {
    result.colorImages[group.name] = group.image;
  });

  // Build suggested variants
  result.suggestedVariants = colorGroups.map(group => ({
    color: group.name,
    colorHex: group.colorHex,
    images: group.images,
    displayTitle: group.name,
    title: group.name
  }));

  // Overall confidence
  const avgConfidence = colorGroups.reduce((acc, g) => acc + g.confidence, 0) / colorGroups.length;
  if (avgConfidence >= 0.85) {
    result.confidence = "high";
  } else if (avgConfidence >= 0.70) {
    result.confidence = "medium";
  } else {
    result.confidence = "low";
    result.reviewNeeded = true;
  }

  return result;
}

/**
 * Scans existing products stored in MongoDB and computes detected colors.
 * Uses batch processing for ultra-fast scan times.
 */
async function scanExistingProducts(ProductModel, query = {}) {
  const products = await ProductModel.find(query)
    .select("title images colors colorImages variants category brand price discountPrice stock displayImage")
    .populate("category", "name")
    .lean();

  const scanResults = [];
  const BATCH_SIZE = 8;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const chunk = products.slice(i, i + BATCH_SIZE);
    const chunkPromises = chunk.map(async (prod) => {
      const images = Array.isArray(prod.images) ? prod.images : [];
      const currentColors = Array.isArray(prod.colors)
        ? prod.colors.map(c => typeof c === "object" ? (c.name || c.color || "") : c).filter(Boolean)
        : [];

      let detected = { detectedColors: [], colorImages: {}, confidence: "none", reviewNeeded: false };

      if (images.length > 0) {
        detected = await detectProductColors(prod.title, images.slice(0, 6));
      }

      const detectedNames = detected.detectedColors.map(c => c.name);
      const hasExistingColors = currentColors.length > 0;
      const hasDetectedColors = detected.detectedColors.length > 0;

      let status = "missing_colors";
      if (hasExistingColors && hasDetectedColors) {
        const matchAll = currentColors.every(c => detectedNames.includes(c));
        status = matchAll ? "verified_match" : "partial_or_new_colors";
      } else if (hasDetectedColors && !hasExistingColors) {
        status = "ready_to_populate";
      } else if (!hasDetectedColors) {
        status = "no_images_or_unclear";
      }

      return {
        _id: prod._id,
        title: prod.title,
        category: prod.category?.name || "General",
        imagesCount: images.length,
        sampleImage: prod.displayImage || images[0] || "",
        images,
        currentColors: Array.isArray(prod.colors) ? prod.colors : [],
        detectedColors: detected.detectedColors,
        colorImages: detected.colorImages,
        confidence: detected.confidence,
        reviewNeeded: detected.reviewNeeded,
        status,
        variantsCount: (prod.variants || []).length
      };
    });

    const chunkResults = await Promise.all(chunkPromises);
    scanResults.push(...chunkResults);
  }

  return scanResults;
}

/**
 * Global snapshot storage for safe rollback of bulk updates.
 */
let lastBulkRollbackSnapshot = null;

/**
 * Applies detected colors safely to MongoDB products without deleting existing data.
 */
async function applyDetectedColorsToProducts(ProductModel, productUpdates = []) {
  if (!Array.isArray(productUpdates) || productUpdates.length === 0) {
    return { updatedCount: 0, message: "No product updates provided" };
  }

  const snapshot = [];
  const updatedIds = [];

  for (const update of productUpdates) {
    const { productId, colors, colorImages } = update;
    if (!productId || !Array.isArray(colors)) continue;

    const existingProduct = await ProductModel.findById(productId);
    if (!existingProduct) continue;

    // Save snapshot of current state for rollback
    snapshot.push({
      productId: existingProduct._id.toString(),
      colors: existingProduct.colors ? JSON.parse(JSON.stringify(existingProduct.colors)) : [],
      colorImages: existingProduct.colorImages ? JSON.parse(JSON.stringify(existingProduct.colorImages)) : {},
      variants: existingProduct.variants ? JSON.parse(JSON.stringify(existingProduct.variants)) : []
    });

    // Format new colors
    const formattedColors = colors.map(c => {
      const name = typeof c === "object" ? (c.name || "") : c;
      const hex = typeof c === "object" ? (c.colorHex || c.value || resolveColorHex(name)) : resolveColorHex(name);
      const img = typeof c === "object" && c.image ? c.image : (colorImages ? colorImages[name] : "");
      const imgs = typeof c === "object" && Array.isArray(c.images) ? c.images : (img ? [img] : []);
      return {
        name,
        value: hex,
        colorHex: hex,
        image: img || "",
        images: imgs
      };
    }).filter(c => c.name);

    existingProduct.colors = formattedColors;

    if (colorImages && typeof colorImages === "object") {
      existingProduct.colorImages = {
        ...(existingProduct.colorImages || {}),
        ...colorImages
      };
    }

    // Safely update variants color associations without changing prices or stock
    if (Array.isArray(existingProduct.variants) && existingProduct.variants.length > 0) {
      existingProduct.variants = existingProduct.variants.map((v, vIdx) => {
        const vObj = v.toObject ? v.toObject() : { ...v };
        // If variant doesn't have a color, or only has 1 detected color, map it
        if (!vObj.color && formattedColors.length === 1) {
          vObj.color = formattedColors[0].name;
          vObj.colorHex = formattedColors[0].colorHex;
          if ((!vObj.images || vObj.images.length === 0) && formattedColors[0].image) {
            vObj.images = [formattedColors[0].image];
          }
        } else if (vObj.color) {
          // Sync hex
          const matchC = formattedColors.find(c => c.name.toLowerCase() === vObj.color.toLowerCase());
          if (matchC) {
            vObj.colorHex = matchC.colorHex;
            if ((!vObj.images || vObj.images.length === 0) && matchC.image) {
              vObj.images = [matchC.image];
            }
          }
        }
        return vObj;
      });
    } else if (formattedColors.length > 0) {
      // Create safe initial variants if none existed
      existingProduct.variants = formattedColors.map(c => ({
        size: "Standard",
        color: c.name,
        colorHex: c.colorHex,
        price: Number(existingProduct.price || 0),
        discountPrice: Number(existingProduct.discountPrice || 0),
        stock: Number(existingProduct.stock || 10),
        sku: `PRO-${Date.now().toString().slice(-4)}`,
        images: c.images && c.images.length > 0 ? c.images : [c.image].filter(Boolean)
      }));
    }

    await existingProduct.save();
    updatedIds.push(productId);
  }

  const snapshotId = `snapshot_${Date.now()}`;
  lastBulkRollbackSnapshot = {
    snapshotId,
    timestamp: new Date().toISOString(),
    records: snapshot
  };

  return {
    updatedCount: updatedIds.length,
    updatedIds,
    snapshotId,
    message: `Successfully applied automatic colors to ${updatedIds.length} products.`
  };
}

/**
 * Rolls back products to previous state from the last snapshot.
 */
async function rollbackLastBulkUpdate(ProductModel) {
  if (!lastBulkRollbackSnapshot || !lastBulkRollbackSnapshot.records || lastBulkRollbackSnapshot.records.length === 0) {
    return { rolledBackCount: 0, message: "No rollback snapshot available." };
  }

  let count = 0;
  for (const record of lastBulkRollbackSnapshot.records) {
    const prod = await ProductModel.findById(record.productId);
    if (prod) {
      prod.colors = record.colors;
      prod.colorImages = record.colorImages;
      prod.variants = record.variants;
      await prod.save();
      count++;
    }
  }

  const rolledBackCount = count;
  lastBulkRollbackSnapshot = null; // Clear after rollback

  return {
    rolledBackCount,
    message: `Successfully rolled back ${rolledBackCount} products to their previous state.`
  };
}

module.exports = {
  detectProductColors,
  scanExistingProducts,
  applyDetectedColorsToProducts,
  rollbackLastBulkUpdate,
  analyzeImagePixels,
  extractTitleColorCandidates,
  matchColorWithKnowledgeBase,
  resolveImageBuffer,
  COLOR_PALETTE,
  TITLE_COLOR_KEYWORDS
};
