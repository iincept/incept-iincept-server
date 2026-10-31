require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

const MONGO_URI = process.env.MONGO_URI;

const seedAdmin = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB successfully.");

    // Get command line arguments (e.g., node seed_admin.js admin@example.com password123)
    const email = process.argv[2] || "admin@iincept.com";
    const password = process.argv[3] || "AdminPass123!";
    const name = process.argv[4] || "System Admin";

    console.log(`Checking if admin user with email "${email}" exists...`);
    let adminUser = await User.findOne({ email: email.toLowerCase() });

    if (adminUser) {
      console.log(`User with email "${email}" already exists. Resetting password and promoting to admin...`);
      adminUser.role = "admin";
      adminUser.password = password;
      await adminUser.save();
      console.log(`User "${email}" is now an admin with password reset to "${password}".`);
    } else {
      console.log(`Creating new admin user: Name: "${name}", Email: "${email}"`);
      adminUser = await User.create({
        name,
        email,
        password,
        role: "admin",
        gender: "not_specified",
        dateOfBirth: "not_specified",
        isStudentOrTeacher: false,
      });
      console.log(`Admin user created successfully.`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin user:", error);
    process.exit(1);
  }
};

seedAdmin();
