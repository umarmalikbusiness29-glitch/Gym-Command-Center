#!/usr/bin/env node
/**
 * Admin User Creation Script
 * Run this to create a new admin user in the database
 * Usage: npm run create-admin
 */

import { storage } from "./server/storage.js";
import { randomBytes } from "crypto";

async function createAdminUser() {
  try {
    console.log("🔐 Creating Admin User...\n");

    // Check if user already exists
    const existingUser = await storage.getUserByUsername("um4779486");
    if (existingUser) {
      console.log("❌ User um4779486 already exists!");
      process.exit(1);
    }

    // Generate strong password
    const password = randomBytes(16).toString("hex");
    
    // Hash password
    const hashedPassword = await (storage as any).hashPassword(password);

    // Create admin user with member profile
    await storage.createMember(
      {
        username: "um4779486",
        password: hashedPassword,
        role: "admin",
        isActive: true
      },
      {
        fullName: "Admin User",
        email: "um4779486@gmail.com",
        phone: "",
        gender: "other",
        monthlyFee: "0",
        joinDate: new Date().toISOString(),
        nextDueDate: new Date().toISOString(),
        status: "active",
        planType: "vip"
      }
    );

    console.log("✅ Admin user created successfully!\n");
    console.log("📋 Admin Credentials:");
    console.log("━".repeat(50));
    console.log(`👤 Username:  um4779486`);
    console.log(`📧 Email:     um4779486@gmail.com`);
    console.log(`🔑 Password:  ${password}`);
    console.log(`👑 Role:      Admin`);
    console.log(`📊 Plan:      VIP`);
    console.log("━".repeat(50));
    console.log("\n💾 Save these credentials in a secure location!");
    console.log("🌐 Login at: https://gymnewmaka.web.app\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
    process.exit(1);
  }
}

createAdminUser();
