'use strict';

const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, PutLifecycleConfigurationCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const SIGNED_URL_EXPIRY_SECONDS = 900;
const S3_BUCKET = process.env.AWS_S3_BUCKET || 'sahakarhelp-files';
const S3_REGION = process.env.AWS_REGION || 'ap-south-1';
const LIFECYCLE_DAYS = 1;
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

class S3StorageService {
  constructor() {
    this.client = null;
    this.initialized = false;
    this.lifecycleConfigured = false;
  }

  initialize() {
    if (this.initialized) return;

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      console.error('[S3StorageService] FATAL: AWS credentials not configured. S3 is required for PACS eKYC tool.');
      process.exit(1);
    }

    this.client = new S3Client({
      region: S3_REGION,
      credentials: { accessKeyId, secretAccessKey }
    });

    this.initialized = true;
    console.log('[S3StorageService] Initialized with bucket:', S3_BUCKET);
    this.configureLifecycle();
  }

  async configureLifecycle() {
    if (this.lifecycleConfigured) return;
    try {
      const rule = {
        Rules: [{
          ID: 'PACS-eKYC-AutoDelete',
          Status: 'Enabled',
          Prefix: 'ekyc/',
          Expiration: { Days: LIFECYCLE_DAYS }
        }]
      };
      await this.client.send(new PutLifecycleConfigurationCommand({
        Bucket: S3_BUCKET,
        LifecycleConfiguration: rule
      }));
      this.lifecycleConfigured = true;
      console.log(`[S3StorageService] Lifecycle rule set: auto-delete after ${LIFECYCLE_DAYS} day(s)`);
    } catch (err) {
      console.warn('[S3StorageService] Could not set lifecycle rule:', err.message);
    }
  }

  isAvailable() {
    return this.client !== null;
  }

  validateFileSize(buffer) {
    if (!buffer || buffer.length === 0) {
      throw Object.assign(new Error('EMPTY_FILE'), { code: 'EMPTY_FILE', retryPossible: false });
    }
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
      throw Object.assign(new Error(`FILE_TOO_LARGE`), {
        code: 'FILE_TOO_LARGE',
        retryPossible: false,
        maxSizeMB: MAX_FILE_SIZE_BYTES / (1024 * 1024),
        actualSizeMB: parseFloat(sizeMB)
      });
    }
    return true;
  }

  async uploadFile(buffer, key, contentType = 'application/pdf') {
    if (!this.isAvailable()) {
      throw Object.assign(new Error('S3_STORAGE_NOT_AVAILABLE'), { code: 'S3_STORAGE_NOT_AVAILABLE', retryPossible: false });
    }
    this.validateFileSize(buffer);

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
      Metadata: { 'x-amz-content-sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' }
    });

    await this.client.send(command);
    return key;
  }

  async getSignedUrl(key, expiresIn = SIGNED_URL_EXPIRY_SECONDS) {
    if (!this.isAvailable()) {
      throw Object.assign(new Error('S3_STORAGE_NOT_AVAILABLE'), { code: 'S3_STORAGE_NOT_AVAILABLE', retryPossible: false });
    }

    const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
    const url = await getSignedUrl(this.client, command, { expiresIn });
    return url;
  }

  async deleteFile(key) {
    if (!this.isAvailable()) return false;
    try {
      const command = new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key });
      await this.client.send(command);
      return true;
    } catch (err) {
      console.warn('[S3StorageService] Delete failed:', err.message);
      return false;
    }
  }

  generateKey(prefix, extension = 'pdf') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}/ekyc-${timestamp}-${random}.${extension}`;
  }
}

const storageService = new S3StorageService();
storageService.initialize();

module.exports = storageService;