const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer = null;

// Silence logs in test mode
if (process.env.NODE_ENV === 'test') {
  global.console.log = () => {};
  global.console.warn = () => {};
  global.console.error = () => {};
}

beforeAll(async () => {
  try {
    // Try mongodb-memory-server first
    mongoServer = await MongoMemoryServer.create({
      binary: {
        version: '7.0.11'
      }
    });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB Memory Server for tests');
  } catch (err) {
    // Fallback to Docker MongoDB if mongodb-memory-server fails (e.g., on aarch64-debian12)
    console.log('MongoDB Memory Server failed, falling back to Docker MongoDB...');
    try {
      const localUri = 'mongodb://127.0.0.1:27017/test_sahakarhelp';
      await mongoose.connect(localUri);
      console.log('✅ Connected to Docker MongoDB for tests');
    } catch (dockerErr) {
      console.error('Failed to connect to MongoDB:', dockerErr.message);
      throw dockerErr;
    }
  }
}, 60000);

afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (err) {
    console.warn('Error during test cleanup:', err.message);
  }
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    try {
      await collections[key].deleteMany({});
    } catch (err) {
      // Collection may not exist yet
    }
  }
});