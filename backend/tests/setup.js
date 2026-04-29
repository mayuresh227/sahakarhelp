const mongoose = require('mongoose');

const TEST_MONGO_URI =
  process.env.TEST_MONGO_URI ||
  'mongodb://127.0.0.1:27017/test_sahakarhelp';

process.env.MONGO_URI = TEST_MONGO_URI;
process.env.MONGODB_URI = TEST_MONGO_URI;

beforeAll(async () => {
  try {
    await mongoose.connect(TEST_MONGO_URI);
    console.log('✅ MongoDB connected successfully for tests');
  } catch (err) {
    console.error('mongoose.connection.readyState:', mongoose.connection.readyState);
    console.error('MongoDB connection error details:', err);
    throw new Error('MongoDB not running. Start MongoDB before tests.');
  }
});

afterAll(async () => {
  await mongoose.disconnect();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
