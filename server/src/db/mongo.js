const mongoose = require('mongoose');

async function connectMongo() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('[mongo] connected');
}

module.exports = { connectMongo };