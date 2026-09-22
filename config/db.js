const mongoose = require("mongoose");

/**
 * Connects to MongoDB using the URI in the environment.
 * Fails fast on startup if the DB is unreachable, rather than
 * letting the app boot into a broken state.
 */
async function connectDB() {
  try {
    mongoose.set("strictQuery", true);
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[db] MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`[db] Connection error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = connectDB;
