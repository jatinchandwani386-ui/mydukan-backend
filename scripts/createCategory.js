const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function run() {
  try {
    const uri = process.env.MONGO_URI;
    
    if (!uri) {
      throw new Error("MONGO_URI nahi mili .env file ke andar!");
    }

    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    const exists = await db.collection('categories').findOne({ slug: 'electronics' });
    if (!exists) {
      await db.collection('categories').insertOne({
        name: 'Electronics',
        slug: 'electronics',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Electronics Category Created Successfully!');
    } else {
      console.log('✅ Category already exists!');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();