/**
 * Run once to create your first admin login:
 *   node scripts/createAdmin.js "Your Name" you@example.com "a-strong-password"
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

async function run() {
  const [name, email, password] = process.argv.slice(2);
  if (!name || !email || !password) {
    console.error('Usage: node scripts/createAdmin.js "Name" email@example.com password');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.log(`Admin with email ${email} already exists.`);
    process.exit(0);
  }

  const user = await User.create({ name, email, password, role: "admin" });
  console.log(`Admin created: ${user.email}`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
