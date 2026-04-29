const mongoose = require('mongoose');

// Silence logs in test mode
if (process.env.NODE_ENV === 'test') {
  global.console.log = () => {};
  global.console.warn = () => {};
  global.console.error = () => {};
}

const TEST_DB = 'test_sahakarhelp';

beforeAll(async () => {
  try {
    // Try to connect to existing local MongoDB first
    const localUri = `mongodb://127.0.0.1:27017/${TEST_DB}`;
    
    try {
      await mongoose.connect(localUri);
      console.log('✅ Connected to local MongoDB for tests');
      return;
    } catch (localErr) {
      console.log('Local MongoDB not available, checking Docker...');
    }

    // Fallback: Check if Docker MongoDB is available
    const { execSync } = require('child_process');
    try {
      const existing = execSync(`docker ps -q --filter "publish=27017"`, { encoding: 'utf8' }).trim();
      if (existing) {
        const dockerUri = `mongodb://localhost:27017/${TEST_DB}`;
        await mongoose.connect(dockerUri);
        console.log('✅ Connected to Docker MongoDB for tests');
        return;
      }
    } catch (dockerErr) {
      // Docker check failed
    }

    throw new Error('No MongoDB available. Please start MongoDB locally or ensure Docker is running.');

  } catch (err) {
    throw new Error('Test environment setup failed: ' + err.message);
  }
}, 30000);

afterAll(async () => {
  try {
    await mongoose.disconnect();
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