const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('../models/adminModel'); // Path from image looks correct

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.DBurl);
    console.log("Connected to database...");

    const adminExists = await Admin.findOne({ email: 'superadmin@platform.com' });
    if (adminExists) {
      console.log("Super Admin already exists. Skipping.");
      process.exit();
    }

    // Note: No manual bcrypt hashing here because your 
    // adminSchema.pre("save") hook handles it automatically.
    const superAdmin = new Admin({
      full_name: "Super Admin User",
      email: "superadmin@platform.com",
      password: "Admin@12345", // The pre-save hook will hash this
      role: "SuperAdmin",       // Matches your Enum: ["SuperAdmin", "Admin"]
      permissions: [
        "approve_teachers",
        "manage_payments",
        "manage_content",
        "manage_users",
        "view_reports",
        "manage_settings"
      ],
      is_active: true
    });

    await superAdmin.save();
    console.log("==========================================");
    console.log("  ✅ SuperAdmin Created Successfully!");
    console.log("  Email: superadmin@platform.com");
    console.log("  Password: Admin@12345");
    console.log("==========================================");

    process.exit();
  } catch (error) {
    console.error("❌ Seeding Failed:", error.message);
    process.exit(1);
  }
};

seedSuperAdmin();