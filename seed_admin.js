const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const mongoose = require("mongoose");
const User = require("./models/User");

const MONGO_URI = process.env.MONGO_URI;

const seedAdmin = async () => {
  try {
    if (!MONGO_URI) {
      console.error("Error: MONGO_URI is not defined in the environment.");
      process.exit(1);
    }

    // Require credentials from environment variables or command-line arguments (no hardcoded passwords)
    const email = (process.env.ADMIN_SEED_EMAIL || process.env.ADMIN_EMAIL || process.argv[2] || "").trim();
    const password = (process.env.ADMIN_SEED_PASSWORD || process.env.ADMIN_PASSWORD || process.argv[3] || "").trim();
    const name = (process.env.ADMIN_SEED_NAME || process.env.ADMIN_NAME || process.argv[4] || "System Admin").trim();
    const forceReset = process.argv.includes("--force-reset-password");
    const allowProd = process.argv.includes("--allow-production");

    if (process.env.NODE_ENV === "production" && !allowProd) {
      console.error(
        "SAFETY ERROR: Running seed_admin.js in a production environment requires explicit --allow-production flag."
      );
      process.exit(1);
    }

    if (!email || !password) {
      console.error(
        "Error: Admin credentials required.\n" +
        "Please provide credentials via environment variables (ADMIN_EMAIL, ADMIN_PASSWORD) or CLI arguments:\n" +
        "  node seed_admin.js <email> <password> [name] [--force-reset-password]"
      );
      process.exit(1);
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB successfully.");

    console.log(`Checking if admin user with email "${email}" exists...`);
    let adminUser = await User.findOne({ email: email.toLowerCase() });

    if (adminUser) {
      console.log(`User "${email}" already exists. Preserving existing account.`);
      let modified = false;

      // Ensure the user has admin role
      if (adminUser.role !== "admin") {
        console.log(`Promoting user "${email}" to admin role...`);
        adminUser.role = "admin";
        modified = true;
      }

      // Only reset password if explicitly requested with flag
      if (forceReset) {
        console.log(`Explicit --force-reset-password supplied. Updating password for "${email}"...`);
        adminUser.password = password;
        modified = true;
      }

      if (modified) {
        await adminUser.save();
        console.log(`User "${email}" updated successfully.`);
      } else {
        console.log(`Admin user "${email}" is already configured. No changes made.`);
      }
    } else {
      console.log(`Creating new admin user: Name: "${name}", Email: "${email}"`);
      await User.create({
        name,
        email: email.toLowerCase(),
        password,
        role: "admin",
        gender: "not_specified",
        dateOfBirth: "not_specified",
        isStudentOrTeacher: false,
      });
      console.log(`Admin user "${email}" created successfully.`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin user:", error.message);
    process.exit(1);
  }
};

seedAdmin();
