// ─── seedAdmin.js ─────────────────────────────────────────
// Run with: npm run seed
//
// Creates the one admin account using credentials from .env
// If the admin already exists, it skips creation.
// To change admin credentials: update .env then run this again
// with FORCE=true: FORCE=true npm run seed

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const existingAdmin = await User.findOne({ role: "admin" });

    if (existingAdmin && process.env.FORCE !== "true") {
      console.log("ℹ️  Admin account already exists. Skipping.");
      console.log(`   Email: ${existingAdmin.email}`);
      console.log("   To force reset, run: FORCE=true npm run seed");
      await mongoose.disconnect();
      return;
    }

    if (existingAdmin && process.env.FORCE === "true") {
      await User.deleteOne({ role: "admin" });
      console.log("⚠️  Existing admin deleted (FORCE mode)");
    }

    const admin = await User.create({
      name: process.env.ADMIN_NAME || "Admin",
      email: process.env.ADMIN_EMAIL,
      phone: process.env.ADMIN_PHONE,
      country: process.env.ADMIN_COUNTRY || "Bangladesh",
      password: process.env.ADMIN_PASSWORD,
      role: "admin",
      status: "approved",
    });

    console.log("✅ Admin account created successfully");
    console.log(`   Name:  ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role:  ${admin.role}`);
    console.log("\n🔒 Credentials are stored in your .env file only.");
    console.log("   Never share or commit your .env file to GitHub.\n");

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Seed failed:", error.message);
    process.exit(1);
  }
};

seed();
