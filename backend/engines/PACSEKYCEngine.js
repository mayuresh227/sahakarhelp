'use strict';

const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const { execSync } = require('child_process');

const A4_WIDTH = 595;
const A4_HEIGHT = 842;
const TARGET_SIZE_KB = 250;
const MIN_QUALITY = 40;
const MAX_QUALITY = 85;
const MAX_IMAGE_WIDTH = 1200;
const FIXED_DPI = 150;
const SAFE_MARGIN_PERCENT = 5;
const CROP_AREA_THRESHOLD = 0.80;
const MAX_TOTAL_PAGES = 3;
const MAX_EXECUTION_TIME_MS = 10000;
const SIZE_LIMIT_ERROR = 'SIZE_LIMIT_NOT_MET';
const S3_KEY_PREFIX = 'ekyc/pacs';
const SIGNED_URL_EXPIRY_SECONDS = 900;
const MAX_INPUT_FILE_SIZE_BYTES = 2 * 1024 * 1024;

const TOOL_VERSION = 'v1';
const TOOL_DEPRECATED = false;
const DEPRECATION_WARNING = 'pacs_ekyc_tool:v1 is deprecated. Consider upgrading to v2 for improved performance and features.';

const SLA_FAILURE_RATE_THRESHOLD = 0.1;
const SLA_SIZE_LIMIT_THRESHOLD = 0.15;
const SLA_WINDOW_MS = 300000;

const CONSENT_VERSION = '1.0';
const CONSENT_TEXT = 'I consent to the processing of my eKYC documents (eKYC Form, Aadhaar Card, and optional Identity Proof) for the purpose of PACS membership verification. My documents will be compressed and stored securely as per applicable data protection regulations.';

const PAGE_QUALITY = {
  0: { min: 80, max: 85, name: 'ekycForm' },
  1: { min: 60, max: 70, name: 'aadhaarCard' },
  2: { min: 50, max: 60, name: 'identityProof' }
};

let storageService = null;
let analyticsService = null;
let usageService = null;

const loadDependencies = () => {
  if (!storageService) {
    try {
      storageService = require('../services/S3StorageService');
    } catch (e) {
      console.error('[PACSEKYCEngine] FATAL: S3StorageService not available');
    }
  }
  if (!analyticsService) {
    try {
      analyticsService = require('../services/EKYCAnalyticsService');
    } catch (e) {
      console.warn('[PACSEKYCEngine] EKYCAnalyticsService not available');
    }
  }
  if (!usageService) {
    try {
      usageService = require('../services/UsageService');
    } catch (e) {
      console.warn('[PACSEKYCEngine] UsageService not available');
    }
  }
};

const safeLog = (level, event, data) => {
  const safeData = {
    event,
    timestamp: new Date().toISOString(),
    ...data
  };
  delete safeData.ekycBuffer;
  delete safeData.aadhaarBuffer;
  delete safeData.identityBuffer;
  delete safeData.buffer;
  console[level](JSON.stringify(safeData));
};

class PACSEKYCEngine {
  constructor() {
    this.engineType = 'pacs_ekyc';
    this.version = TOOL_VERSION;
    this.deprecated = TOOL_DEPRECATED;
    this.pdfToolsAvailable = this.checkPdfTools();
    this.slaWindow = [];
    this.slaWebhookUrl = process.env.SLA_WEBHOOK_URL || null;
    loadDependencies();
  }

  checkPdfTools() {
    const tools = { pdftoppm: false, ghostscript: false };
    try {
      execSync('which pdftoppm', { stdio: 'pipe' });
      tools.pdftoppm = true;
    } catch (e) {
      if (process.env.NODE_ENV === 'test') {
        console.warn('[PACSEKYCEngine] WARNING: pdftoppm not found. PDF rendering may fail.');
      } else {
        throw new Error('[PACSEKYCEngine] Missing required dependency: pdftoppm');
      }
    }
    try {
      execSync('which gs', { stdio: 'pipe' });
      tools.ghostscript = true;
    } catch (e) {
      if (process.env.NODE_ENV === 'test') {
        console.warn('[PACSEKYCEngine] WARNING: ghostscript not found. PDF rendering may fail.');
      } else {
        throw new Error('[PACSEKYCEngine] Missing required dependency: ghostscript');
      }
    }
    return tools;
  }

  async triggerSLAWebhook(alerts, requestId) {
    if (!this.slaWebhookUrl) {
      return;
    }

    const payload = {
      tool: 'pacs_ekyc_tool',
      version: TOOL_VERSION,
      requestId,
      timestamp: new Date().toISOString(),
      alerts
    };

    try {
      const response = await fetch(this.slaWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        safeLog('warn', 'SLA_WEBHOOK_FAILED', { requestId, status: response.status });
      } else {
        safeLog('info', 'SLA_WEBHOOK_TRIGGERED', { requestId, alertCount: alerts.length });
      }
    } catch (err) {
      safeLog('warn', 'SLA_WEBHOOK_ERROR', { requestId, error: err.message });
    }
  }

  checkSLAThresholds(requestId = null) {
    const now = Date.now();
    this.slaWindow = this.slaWindow.filter(entry => now - entry.timestamp < SLA_WINDOW_MS);

    if (this.slaWindow.length < 10) return null;

    const failures = this.slaWindow.filter(e => !e.success).length;
    const sizeLimitFails = this.slaWindow.filter(e => e.sizeLimitNotMet).length;
    const failureRate = failures / this.slaWindow.length;
    const sizeLimitRate = sizeLimitFails / this.slaWindow.length;

    const alerts = [];

    if (failureRate > SLA_FAILURE_RATE_THRESHOLD) {
      const alert = {
        type: 'failure_rate',
        rate: failureRate,
        threshold: SLA_FAILURE_RATE_THRESHOLD,
        windowSize: this.slaWindow.length,
        message: `Failure rate ${(failureRate * 100).toFixed(1)}% exceeds threshold ${SLA_FAILURE_RATE_THRESHOLD * 100}%`
      };
      alerts.push(alert);
      console.warn(`[PACSEKYCEngine] SLA ALERT [${requestId || 'system'}]:`, JSON.stringify(alert));
    }

    if (sizeLimitRate > SLA_SIZE_LIMIT_THRESHOLD) {
      const alert = {
        type: 'size_limit_rate',
        rate: sizeLimitRate,
        threshold: SLA_SIZE_LIMIT_THRESHOLD,
        windowSize: this.slaWindow.length,
        message: `Size limit failure rate ${(sizeLimitRate * 100).toFixed(1)}% exceeds threshold ${SLA_SIZE_LIMIT_THRESHOLD * 100}%`
      };
      alerts.push(alert);
      console.warn(`[PACSEKYCEngine] SLA ALERT [${requestId || 'system'}]:`, JSON.stringify(alert));
    }

    if (alerts.length > 0) {
      this.triggerSLAWebhook(alerts, requestId);
    }

    return alerts.length > 0 ? alerts : null;
  }

  recordSLAEntry(success, sizeLimitNotMet, requestId = null) {
    this.slaWindow.push({
      success,
      sizeLimitNotMet,
      timestamp: Date.now(),
      requestId
    });
    this.checkSLAThresholds(requestId);
  }

  checkSunsetDate(sunsetDate, requestId) {
    if (!sunsetDate) return { allowed: true, expired: false };

    const now = new Date();
    const sunset = new Date(sunsetDate);

    if (sunset < now) {
      safeLog('warn', 'TOOL_DEPRECATED', {
        requestId,
        tool: 'pacs_ekyc_tool',
        version: TOOL_VERSION,
        sunsetDate,
        currentDate: now.toISOString()
      });
      return {
        allowed: false,
        expired: true,
        sunsetDate,
        message: `This tool version expired on ${sunsetDate}`
      };
    }

    return { allowed: true, expired: false, sunsetDate };
  }

  async execute(tool, inputs, context = {}) {
    const startTime = Date.now();
    loadDependencies();

    const userId = context.userId || null;
    const clientIp = context.clientIp || null;
    const requestId = context.requestId || `req-${Date.now()}`;
    const userConsent = inputs.userConsent || false;
    const consentVersion = inputs.consentVersion || CONSENT_VERSION;
    const consentText = inputs.consentText || CONSENT_TEXT;
    const sunsetDate = tool.sunsetDate || null;

    const sunsetCheck = this.checkSunsetDate(sunsetDate, requestId);
    if (!sunsetCheck.allowed) {
      return {
        success: false,
        data: null,
        error: {
          code: 'TOOL_DEPRECATED',
          message: sunsetCheck.message,
          suggestion: 'This tool version has been deprecated. Please use a newer version.',
          retryPossible: false
        },
        meta: {
          contractVersion: 'v1',
          requestId,
          tool: tool.slug,
          version: tool.version,
          sunsetDate,
          deprecated: true
        }
      };
    }

    if (TOOL_DEPRECATED) {
      safeLog('warn', 'TOOL_DEPRECATED', { requestId, tool: tool.slug, version: TOOL_VERSION });
    }

    if (!userConsent) {
      return {
        success: false,
        data: null,
        error: {
          code: 'CONSENT_REQUIRED',
          message: 'User consent is required to process eKYC documents. Please accept the terms and conditions.',
          suggestion: 'Set userConsent: true in your request to proceed.',
          retryPossible: false
        },
        meta: {
          contractVersion: 'v1',
          requestId,
          deprecated: TOOL_DEPRECATED,
          deprecationWarning: DEPRECATION_WARNING
        }
      };
    }

    if (analyticsService) {
      await analyticsService.trackConsent({
        userId,
        toolSlug: tool.slug,
        timestamp: new Date(),
        ipAddress: clientIp,
        granted: userConsent,
        consentVersion,
        consentText,
        requestId
      });
    }

    if (analyticsService && !analyticsService.checkConcurrencyLimit(userId)) {
      return {
        success: false,
        data: null,
        error: {
          code: 'CONCURRENCY_LIMIT_EXCEEDED',
          message: 'Maximum concurrent jobs limit (2) reached. Please wait for existing jobs to complete.',
          suggestion: 'Wait a few seconds and retry, or check your dashboard for running jobs.',
          retryPossible: true
        },
        meta: {
          contractVersion: 'v1',
          requestId,
          deprecated: TOOL_DEPRECATED,
          deprecationWarning: DEPRECATION_WARNING
        }
      };
    }

    if (analyticsService) {
      analyticsService.incrementActiveJobs(userId);
    }

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('EXECUTION_TIMEOUT')), MAX_EXECUTION_TIME_MS);
    });

    const executionPromise = this.executeWithTimeout(tool, inputs, context, startTime, userId, clientIp, requestId);

    try {
      return await Promise.race([executionPromise, timeoutPromise]);
    } finally {
      if (analyticsService) {
        analyticsService.decrementActiveJobs(userId);
      }
    }
  }

  async executeWithTimeout(tool, inputs, context, startTime, userId, clientIp, requestId) {
    switch (tool.slug) {
      case 'pacs_ekyc_tool':
        return this.processEKYC(inputs, startTime, userId, clientIp, requestId);
      default:
        throw new Error(`Unsupported tool for PACSEKYC engine: ${tool.slug}`);
    }
  }

  validateInputSize(buffer, fieldName) {
    if (!buffer || buffer.length === 0) {
      throw Object.assign(new Error(`${fieldName}_EMPTY`), {
        code: 'VALIDATION_FAILED',
        field: fieldName,
        retryPossible: false
      });
    }
    if (buffer.length > MAX_INPUT_FILE_SIZE_BYTES) {
      const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
      throw Object.assign(new Error(`${fieldName}_TOO_LARGE`), {
        code: 'FILE_TOO_LARGE',
        field: fieldName,
        maxSizeMB: MAX_INPUT_FILE_SIZE_BYTES / (1024 * 1024),
        actualSizeMB: parseFloat(sizeMB),
        retryPossible: false
      });
    }
    return true;
  }

  async processEKYC({ ekycForm, aadhaarCard, identityProof, userConsent, consentVersion, consentText }, startTime, userId, clientIp, requestId) {
    const tempFiles = [];
    let s3Key = null;
    let creditsDeducted = false;
    let reservationId = null;

    try {
      if (!ekycForm || !ekycForm.buffer) {
        return this.errorResponse('VALIDATION_FAILED', 'ekycForm is required', false, requestId);
      }
      if (!aadhaarCard || !aadhaarCard.buffer) {
        return this.errorResponse('VALIDATION_FAILED', 'aadhaarCard is required', false, requestId);
      }

      const ekycBuffer = Buffer.isBuffer(ekycForm.buffer) ? ekycForm.buffer : Buffer.from(ekycForm.buffer);
      const aadhaarBuffer = Buffer.isBuffer(aadhaarCard.buffer) ? aadhaarCard.buffer : Buffer.from(aadhaarCard.buffer);

      safeLog('info', 'PACS_EKYC_START', {
        requestId,
        userId,
        hasIdentityProof: !!identityProof,
        ekycSizeKB: Math.round(ekycBuffer.length / 1024),
        aadhaarSizeKB: Math.round(aadhaarBuffer.length / 1024)
      });

      this.validateInputSize(ekycBuffer, 'ekycForm');
      this.validateInputSize(aadhaarBuffer, 'aadhaarCard');

      let identityBuffer = null;
      if (identityProof && identityProof.buffer) {
        identityBuffer = Buffer.isBuffer(identityProof.buffer) ? identityProof.buffer : Buffer.from(identityProof.buffer);
        this.validateInputSize(identityBuffer, 'identityProof');
      }

      if (!this.isValidBuffer(ekycBuffer)) {
        return this.errorResponse('VALIDATION_FAILED', 'ekycForm is corrupted or invalid', false, requestId);
      }
      if (!this.isValidBuffer(aadhaarBuffer)) {
        return this.errorResponse('VALIDATION_FAILED', 'aadhaarCard is corrupted or invalid', false, requestId);
      }
      if (identityBuffer && !this.isValidBuffer(identityBuffer)) {
        return this.errorResponse('VALIDATION_FAILED', 'identityProof is corrupted or invalid', false, requestId);
      }

      if (!this.validatePdfLib(ekycBuffer)) {
        return this.errorResponse('VALIDATION_FAILED', 'ekycForm parsing failed', false, requestId);
      }
      if (!this.validatePdfLib(aadhaarBuffer)) {
        return this.errorResponse('VALIDATION_FAILED', 'aadhaarCard parsing failed', false, requestId);
      }
      if (identityBuffer && !this.validatePdfLib(identityBuffer)) {
        return this.errorResponse('VALIDATION_FAILED', 'identityProof parsing failed', false, requestId);
      }

      const ekycIsPDF = this.getFileExtension(ekycBuffer) === '.pdf';
      const aadhaarIsPDF = this.getFileExtension(aadhaarBuffer) === '.pdf';
      const identityIsPDF = identityBuffer ? this.getFileExtension(identityBuffer) === '.pdf' : false;

      let totalPages = 1 + 1 + (identityBuffer ? 1 : 0);
      if (ekycIsPDF) {
        const ekycPdf = await PDFDocument.load(ekycBuffer);
        totalPages = totalPages - 1 + ekycPdf.getPageCount();
      }
      if (aadhaarIsPDF) {
        const aadhaarPdf = await PDFDocument.load(aadhaarBuffer);
        totalPages = totalPages - 1 + aadhaarPdf.getPageCount();
      }
      if (identityIsPDF) {
        const identityPdf = await PDFDocument.load(identityBuffer);
        totalPages = totalPages - 1 + identityPdf.getPageCount();
      }

      if (totalPages > MAX_TOTAL_PAGES) {
        return this.errorResponse('VALIDATION_FAILED', `Total pages (${totalPages}) exceeds maximum of ${MAX_TOTAL_PAGES}`, false, requestId);
      }

      const processedAadhaar = await this.preprocessImageSafe(aadhaarBuffer, tempFiles, 'aadhaar');
      let processedIdentity = null;
      if (identityBuffer) {
        processedIdentity = await this.preprocessImageSafe(identityBuffer, tempFiles, 'identity');
      }

      const pdfBytes = await this.createMergedPDF(ekycBuffer, processedAadhaar, processedIdentity, tempFiles, ekycIsPDF);
      const finalPdf = await this.pageAwareCompress(pdfBytes, tempFiles);
      const optimizedPdf = await this.finalOptimization(finalPdf, tempFiles);

      if (!this.validateOutputPdf(optimizedPdf)) {
        return this.errorResponse('EXECUTION_ERROR', 'Generated PDF is corrupted', false, requestId);
      }

      const fileSizeKB = Math.round(optimizedPdf.length / 1024);

      if (!storageService || !storageService.isAvailable()) {
        return this.errorResponse('STORAGE_ERROR', 'File storage is temporarily unavailable. Please retry.', true, requestId);
      }

      s3Key = storageService.generateKey(S3_KEY_PREFIX, 'pdf');
      await storageService.uploadFile(optimizedPdf, s3Key, 'application/pdf');
      const fileUrl = await storageService.getSignedUrl(s3Key, SIGNED_URL_EXPIRY_SECONDS);

      const processingTimeMs = Date.now() - startTime;

      if (usageService) {
        try {
          const reserveResult = await usageService.reserveCredits(userId, 'pacs_ekyc_tool', clientIp, { requestId });
          if (reserveResult.success) {
            reservationId = reserveResult.reservationId;
            creditsDeducted = true;
          } else {
            safeLog('warn', 'CREDIT_RESERVATION_FAILED', { requestId, userId, remainingCredits: reserveResult.remainingCredits });
          }
        } catch (creditErr) {
          safeLog('error', 'CREDIT_RESERVATION_ERROR', { requestId, userId, error: creditErr.message });
        }
      }

      if (analyticsService) {
        await analyticsService.trackExecution({
          toolSlug: 'pacs_ekyc_tool',
          userId,
          success: true,
          sizeLimitNotMet: false,
          processingTimeMs,
          fileSizeKB,
          requestId
        });
      }

      this.recordSLAEntry(true, false, requestId);
      safeLog('info', 'PACS_EKYC_SUCCESS', { requestId, userId, fileSizeKB, processingTimeMs });

      const response = {
        success: true,
        data: {
          fileUrl,
          fileSizeKB,
          previewAvailable: true,
          success: true
        },
        error: null,
        meta: {
          contractVersion: 'v1',
          requestId,
          processingTimeMs,
          deprecated: TOOL_DEPRECATED,
          deprecationWarning: TOOL_DEPRECATED ? DEPRECATION_WARNING : null,
          consentVersion: consentVersion || CONSENT_VERSION,
          warnings: [
            ...(fileSizeKB > TARGET_SIZE_KB ? ['File exceeds target size but compression limit reached'] : []),
            ...(TOOL_DEPRECATED ? [DEPRECATION_WARNING] : [])
          ]
        }
      };

      if (reservationId && usageService) {
        await usageService.finalizeReservation(reservationId);
      }

      return response;
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;

      if (usageService && reservationId) {
        try {
          await usageService.releaseReservation(reservationId, userId, 'pacs_ekyc_tool', clientIp);
          safeLog('info', 'CREDITS_RELEASED', { requestId, userId, reason: error.code || error.message });
        } catch (releaseErr) {
          safeLog('error', 'CREDIT_RELEASE_FAILED', { requestId, userId, error: releaseErr.message });
        }
      }

      if (analyticsService) {
        await analyticsService.trackExecution({
          toolSlug: 'pacs_ekyc_tool',
          userId,
          success: false,
          sizeLimitNotMet: error.message === SIZE_LIMIT_ERROR,
          processingTimeMs,
          errorCode: error.code || error.message,
          requestId
        });
      }

      this.recordSLAEntry(false, error.message === SIZE_LIMIT_ERROR, requestId);
      safeLog('info', 'PACS_EKYC_FAILURE', { requestId, userId, errorCode: error.code || error.message, processingTimeMs });

      if (error.code === 'CONCURRENCY_LIMIT_EXCEEDED') {
        return {
          success: false,
          data: null,
          error: {
            code: 'CONCURRENCY_LIMIT_EXCEEDED',
            message: error.message,
            suggestion: 'Wait a few seconds and retry, or check your dashboard for running jobs.',
            retryPossible: true
          },
          meta: { contractVersion: 'v1', requestId, processingTimeMs, deprecated: TOOL_DEPRECATED, deprecationWarning: DEPRECATION_WARNING }
        };
      }

      if (error.code === 'FILE_TOO_LARGE') {
        return {
          success: false,
          data: null,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File ${error.field} exceeds maximum size of ${error.maxSizeMB}MB`,
            suggestion: `Reduce the file size below ${error.maxSizeMB}MB. Try compressing or resizing the image before uploading.`,
            field: error.field,
            maxSizeMB: error.maxSizeMB,
            actualSizeMB: error.actualSizeMB,
            retryPossible: false
          },
          meta: { contractVersion: 'v1', requestId, processingTimeMs, deprecated: TOOL_DEPRECATED, deprecationWarning: DEPRECATION_WARNING }
        };
      }

      if (error.message === 'EXECUTION_TIMEOUT') {
        return {
          success: false,
          data: null,
          error: {
            code: 'EXECUTION_TIMEOUT',
            message: 'Processing took too long and was cancelled.',
            suggestion: 'Try with smaller images or fewer pages. The maximum processing time is 10 seconds.',
            retryPossible: true
          },
          meta: { contractVersion: 'v1', requestId, processingTimeMs, deprecated: TOOL_DEPRECATED, deprecationWarning: DEPRECATION_WARNING }
        };
      }

      if (error.message === SIZE_LIMIT_ERROR) {
        const currentSizeKB = Math.round((error.inputSize || 0) / 1024);
        return {
          success: false,
          data: null,
          error: {
            code: 'SIZE_LIMIT_NOT_MET',
            message: `Cannot achieve target size of ${TARGET_SIZE_KB}KB while maintaining readability`,
            suggestion: `Your images are too large. Try: 1) Resize images to max ${MAX_IMAGE_WIDTH}px width, 2) Crop unnecessary areas, 3) Use lower resolution scans.`,
            currentSizeKB,
            targetSizeKB: TARGET_SIZE_KB,
            recommendedMaxImageWidth: MAX_IMAGE_WIDTH,
            retryPossible: true
          },
          meta: { contractVersion: 'v1', requestId, processingTimeMs, deprecated: TOOL_DEPRECATED, deprecationWarning: DEPRECATION_WARNING }
        };
      }

      if (error.code === 'S3_STORAGE_NOT_AVAILABLE') {
        return {
          success: false,
          data: null,
          error: {
            code: 'STORAGE_ERROR',
            message: 'File storage is temporarily unavailable.',
            suggestion: 'Please retry in a few moments. If the problem persists, contact support.',
            retryPossible: true
          },
          meta: { contractVersion: 'v1', requestId, processingTimeMs, deprecated: TOOL_DEPRECATED, deprecationWarning: DEPRECATION_WARNING }
        };
      }

      return {
        success: false,
        data: null,
        error: {
          code: 'EXECUTION_ERROR',
          message: 'An unexpected error occurred during processing.',
          suggestion: 'Please try again. If the problem persists, contact support with your request ID.',
          retryPossible: true
        },
        meta: { contractVersion: 'v1', requestId, processingTimeMs, deprecated: TOOL_DEPRECATED, deprecationWarning: DEPRECATION_WARNING }
      };
    } finally {
      await this.cleanupTempFiles(tempFiles);
    }
  }

  validatePdfLib(buffer) {
    try {
      PDFDocument.load(buffer);
      return true;
    } catch (e) {
      return false;
    }
  }

  validateOutputPdf(buffer) {
    try {
      if (!buffer || buffer.length < 100) return false;
      const doc = PDFDocument.load(buffer);
      const pageCount = doc.getPageCount();
      if (pageCount < 1) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  isValidBuffer(buffer) {
    if (!buffer || buffer.length < 8) return false;

    const pdfMagic = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
    const jpgMagic = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    const pngMagic = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;

    if (pdfMagic) {
      try {
        const endIdx = buffer.indexOf('%%EOF');
        if (endIdx === -1) return false;
        return true;
      } catch {
        return false;
      }
    }

    if (jpgMagic || pngMagic) {
      return true;
    }

    return false;
  }

  async preprocessImageSafe(imageBuffer, tempFiles, imageType) {
    const tempPath = path.join('/tmp', `preprocess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`);
    tempFiles.push(tempPath);

    const ext = this.getFileExtension(imageBuffer);
    if (ext === '.pdf') {
      const tempPdfPath = path.join('/tmp', `temp-${Date.now()}.pdf`);
      await writeFileAsync(tempPdfPath, imageBuffer);
      tempFiles.push(tempPdfPath);

      const imageData = await this.renderPdfPageWithSharp(tempPdfPath, 0, MAX_IMAGE_WIDTH);
      await writeFileAsync(tempPath, imageData);
      return fs.readFileSync(tempPath);
    }

    const metadata = await sharp(imageBuffer).metadata();
    let pipeline = sharp(imageBuffer);
    pipeline = pipeline.grayscale();

    const croppedBuffer = await this.safeAutoCrop(pipeline, metadata, tempFiles, imageType);
    const processedPipeline = sharp(croppedBuffer);

    if (metadata.width > MAX_IMAGE_WIDTH) {
      processedPipeline.resize(MAX_IMAGE_WIDTH);
    }

    processedPipeline.jpeg({ quality: 65 });
    await processedPipeline.toFile(tempPath);
    return fs.readFileSync(tempPath);
  }

  async renderPdfPageWithSharp(pdfPath, pageIndex, width) {
    const tempOutputDir = path.join('/tmp', `pdf-img-${Date.now()}`);
    fs.mkdirSync(tempOutputDir, { recursive: true });

    try {
      if (this.pdfToolsAvailable.pdftoppm) {
        const density = FIXED_DPI;
        execSync(`pdftoppm -r ${density} -f ${pageIndex + 1} -l ${pageIndex + 1} -jpeg -jpegopt quality=85 "${pdfPath}" "${tempOutputDir}/page"`, { stdio: 'pipe' });

        if (fs.existsSync(`${tempOutputDir}/page-1.jpg`)) {
          const result = fs.readFileSync(`${tempOutputDir}/page-1.jpg`);
          fs.rmSync(tempOutputDir, { recursive: true, force: true });
          return result;
        }
      }

      if (this.pdfToolsAvailable.ghostscript) {
        execSync(`gs -dNOPAUSE -dBATCH -sDEVICE=jpeg -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -r${FIXED_DPI} -sOutputFile="${tempOutputDir}/page-%d.jpg" "${pdfPath}"`, { stdio: 'pipe' });

        const pageFile = path.join(tempOutputDir, `page-${pageIndex + 1}.jpg`);
        if (fs.existsSync(pageFile)) {
          const result = fs.readFileSync(pageFile);
          fs.rmSync(tempOutputDir, { recursive: true, force: true });
          return result;
        }
      }

      fs.rmSync(tempOutputDir, { recursive: true, force: true });
      const pdfDoc = await PDFDocument.load(fs.readFileSync(pdfPath));
      const page = pdfDoc.getPage(pageIndex);
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageIndex]);
      newPdf.addPage(copiedPage);
      const pdfBytes = await newPdf.save();
      return Buffer.from(pdfBytes);
    } catch (err) {
      try { fs.rmSync(tempOutputDir, { recursive: true, force: true }); } catch (e) {}

      const pdfDoc = await PDFDocument.load(fs.readFileSync(pdfPath));
      const page = pdfDoc.getPage(pageIndex);
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageIndex]);
      newPdf.addPage(copiedPage);
      const pdfBytes = await newPdf.save();
      return Buffer.from(pdfBytes);
    }
  }

  async safeAutoCrop(pipeline, metadata, tempFiles, imageType) {
    try {
      const tempCropPath = path.join('/tmp', `crop-${Date.now()}.jpg`);
      tempFiles.push(tempCropPath);

      await pipeline.clone()
        .jpeg({ quality: 90 })
        .toFile(tempCropPath);

      const cropMeta = await sharp(tempCropPath).metadata();
      const minMarginX = Math.floor(cropMeta.width * SAFE_MARGIN_PERCENT / 100);
      const minMarginY = Math.floor(cropMeta.height * SAFE_MARGIN_PERCENT / 100);

      let top = 0, bottom = 0, left = 0, right = 0;
      const threshold = 210;

      for (let y = minMarginY; y < cropMeta.height - minMarginY; y++) {
        const slice = await sharp(tempCropPath)
          .extract({ left: minMarginX, top: y, width: cropMeta.width - 2 * minMarginX, height: 1 })
          .raw()
          .toBuffer();

        let hasContent = false;
        for (let i = 0; i < slice.length; i += 3) {
          const gray = (slice[i] * 0.299 + slice[i+1] * 0.587 + slice[i+2] * 0.114);
          if (gray < threshold) { hasContent = true; break; }
        }
        if (!hasContent) top++;
        else break;
      }

      for (let y = cropMeta.height - minMarginY - 1; y >= minMarginY + top; y--) {
        const slice = await sharp(tempCropPath)
          .extract({ left: minMarginX, top: y, width: cropMeta.width - 2 * minMarginX, height: 1 })
          .raw()
          .toBuffer();

        let hasContent = false;
        for (let i = 0; i < slice.length; i += 3) {
          const gray = (slice[i] * 0.299 + slice[i+1] * 0.587 + slice[i+2] * 0.114);
          if (gray < threshold) { hasContent = true; break; }
        }
        if (!hasContent) bottom++;
        else break;
      }

      for (let x = minMarginX; x < cropMeta.width - minMarginX; x++) {
        const slice = await sharp(tempCropPath)
          .extract({ left: x, top: minMarginY, width: 1, height: cropMeta.height - 2 * minMarginY })
          .raw()
          .toBuffer();

        let hasContent = false;
        for (let i = 0; i < slice.length; i += 3) {
          const gray = (slice[i] * 0.299 + slice[i+1] * 0.587 + slice[i+2] * 0.114);
          if (gray < threshold) { hasContent = true; break; }
        }
        if (!hasContent) left++;
        else break;
      }

      for (let x = cropMeta.width - minMarginX - 1; x >= minMarginX + left; x--) {
        const slice = await sharp(tempCropPath)
          .extract({ left: x, top: minMarginY, width: 1, height: cropMeta.height - 2 * minMarginY })
          .raw()
          .toBuffer();

        let hasContent = false;
        for (let i = 0; i < slice.length; i += 3) {
          const gray = (slice[i] * 0.299 + slice[i+1] * 0.587 + slice[i+2] * 0.114);
          if (gray < threshold) { hasContent = true; break; }
        }
        if (!hasContent) right++;
        else break;
      }

      const newWidth = cropMeta.width - left - right;
      const newHeight = cropMeta.height - top - bottom;
      const cropAreaRatio = (newWidth * newHeight) / (cropMeta.width * cropMeta.height);

      if (cropAreaRatio < CROP_AREA_THRESHOLD) {
        return pipeline.toBuffer();
      }

      const finalLeft = Math.max(minMarginX, left);
      const finalTop = Math.max(minMarginY, top);
      const finalRight = Math.max(minMarginX, right);
      const finalBottom = Math.max(minMarginY, bottom);
      const finalWidth = Math.max(100, cropMeta.width - finalLeft - finalRight);
      const finalHeight = Math.max(100, cropMeta.height - finalTop - finalBottom);

      return pipeline
        .extract({ left: finalLeft, top: finalTop, width: finalWidth, height: finalHeight })
        .toBuffer();
    } catch (err) {
      return pipeline.toBuffer();
    }
  }

  async createMergedPDF(ekycBuffer, aadhaarBuffer, identityBuffer, tempFiles, ekycIsPDF) {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle('PACS eKYC Document');
    pdfDoc.setAuthor('SahakarHelp');
    pdfDoc.setSubject('eKYC Documents');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('SahakarHelp PACS eKYC Tool');
    pdfDoc.setCreator('PACSEKYCEngine');

    if (ekycIsPDF) {
      const ekycPdf = await PDFDocument.load(ekycBuffer);
      const pages = await pdfDoc.copyPages(ekycPdf, ekycPdf.getPageIndices());
      pages.forEach(page => pdfDoc.addPage(page));
    } else {
      const ekycPdf = await this.convertImageToPDFPage(ekycBuffer, tempFiles, 0);
      const pages = await pdfDoc.copyPages(ekycPdf, ekycPdf.getPageIndices());
      pages.forEach(page => pdfDoc.addPage(page));
    }

    const aadhaarPdf = await this.convertImageToPDFPage(aadhaarBuffer, tempFiles, 1);
    const aadhaarPages = await pdfDoc.copyPages(aadhaarPdf, aadhaarPdf.getPageIndices());
    aadhaarPages.forEach(page => pdfDoc.addPage(page));

    if (identityBuffer) {
      const identityPdf = await this.convertImageToPDFPage(identityBuffer, tempFiles, 2);
      const identityPages = await pdfDoc.copyPages(identityPdf, identityPdf.getPageIndices());
      identityPages.forEach(page => pdfDoc.addPage(page));
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  async convertImageToPDFPage(buffer, tempFiles, pageIndex) {
    const tempImgPath = path.join('/tmp', `convert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`);
    tempFiles.push(tempImgPath);

    const pageQuality = PAGE_QUALITY[pageIndex] || PAGE_QUALITY[1];
    const quality = pageQuality.max;

    const metadata = await sharp(buffer).metadata();
    let targetWidth = metadata.width;
    if (targetWidth > MAX_IMAGE_WIDTH) {
      targetWidth = MAX_IMAGE_WIDTH;
    }

    const jpegBuffer = await sharp(buffer)
      .resize(targetWidth)
      .jpeg({ quality })
      .toBuffer();

    await writeFileAsync(tempImgPath, jpegBuffer);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    const jpgImage = await pdfDoc.embedJpg(jpegBuffer);
    const dims = jpgImage.scaleToFit(A4_WIDTH - 40, A4_HEIGHT - 40);

    const x = (A4_WIDTH - dims.width) / 2;
    const y = (A4_HEIGHT - dims.height) / 2;

    page.drawImage(jpgImage, {
      x,
      y,
      width: dims.width,
      height: dims.height
    });

    return pdfDoc;
  }

  async pageAwareCompress(pdfBytes, tempFiles) {
    const initialSize = pdfBytes.length;
    const targetSize = TARGET_SIZE_KB * 1024;

    if (initialSize <= targetSize) {
      return pdfBytes;
    }

    let currentBuffer = Buffer.from(pdfBytes);
    let iteration = 0;
    const maxIterations = 15;

    while (currentBuffer.length > targetSize && iteration < maxIterations) {
      iteration++;

      const compressionRatio = targetSize / currentBuffer.length;
      const pdfDoc = await PDFDocument.load(currentBuffer);
      const pageCount = pdfDoc.getPageCount();
      let newPdf = await PDFDocument.create();

      newPdf.setTitle('PACS eKYC Document');
      newPdf.setAuthor('SahakarHelp');
      newPdf.setSubject('eKYC Documents');
      newPdf.setKeywords([]);
      newPdf.setProducer('SahakarHelp PACS eKYC Tool');
      newPdf.setCreator('PACSEKYCEngine');

      for (let i = 0; i < pageCount; i++) {
        const page = pdfDoc.getPage(i);
        const pageQuality = PAGE_QUALITY[i] || PAGE_QUALITY[1];

        let quality = Math.max(pageQuality.min, Math.min(pageQuality.max, Math.floor(compressionRatio * 100 + 20)));
        if (quality < pageQuality.min) {
          quality = pageQuality.min;
        }

        const { width, height } = page.getSize();
        const scale = MAX_IMAGE_WIDTH / width;
        const renderWidth = Math.round(width * scale);
        const renderHeight = Math.round(height * scale);

        let imageBuffer;
        try {
          const tempPdfPath = path.join('/tmp', `compress-${Date.now()}.pdf`);
          await writeFileAsync(tempPdfPath, currentBuffer);
          tempFiles.push(tempPdfPath);

          imageBuffer = await this.renderPdfPageWithSharp(tempPdfPath, i, MAX_IMAGE_WIDTH);
          imageBuffer = await sharp(imageBuffer)
            .resize(renderWidth, renderHeight)
            .jpeg({ quality })
            .toBuffer();
        } catch (renderErr) {
          const tempPagePath = path.join('/tmp', `page-fallback-${Date.now()}-${i}.jpg`);
          tempFiles.push(tempPagePath);

          const tempPdfPath = path.join('/tmp', `compress-${Date.now()}.pdf`);
          await writeFileAsync(tempPdfPath, currentBuffer);
          tempFiles.push(tempPdfPath);

          imageBuffer = await this.renderPdfPageWithSharp(tempPdfPath, i, MAX_IMAGE_WIDTH);
          await writeFileAsync(tempPagePath, imageBuffer);
          imageBuffer = await sharp(imageBuffer)
            .resize(renderWidth, renderHeight)
            .jpeg({ quality })
            .toBuffer();
        }

        const isLowDensity = await this.isLowDensityPage(imageBuffer);
        let finalBuffer = imageBuffer;
        if (isLowDensity && quality > 30) {
          const reducedQuality = Math.max(30, quality - 15);
          finalBuffer = await sharp(imageBuffer)
            .jpeg({ quality: reducedQuality })
            .toBuffer();
        }

        const tempPagePath = path.join('/tmp', `page-${Date.now()}-${i}.jpg`);
        tempFiles.push(tempPagePath);
        await writeFileAsync(tempPagePath, finalBuffer);

        const newPage = newPdf.addPage([A4_WIDTH, A4_HEIGHT]);
        const jpgImage = await newPdf.embedJpg(finalBuffer);
        const dims = jpgImage.scaleToFit(A4_WIDTH - 40, A4_HEIGHT - 40);

        newPage.drawImage(jpgImage, {
          x: (A4_WIDTH - dims.width) / 2,
          y: (A4_HEIGHT - dims.height) / 2,
          width: dims.width,
          height: dims.height
        });
      }

      const savedBytes = await newPdf.save({ useObjectStreams: true, addDefaultPage: false });
      currentBuffer = Buffer.from(savedBytes);
    }

    if (currentBuffer.length > targetSize) {
      const error = new Error(SIZE_LIMIT_ERROR);
      error.inputSize = currentBuffer.length;
      throw error;
    }

    return currentBuffer;
  }

  async isLowDensityPage(imageBuffer) {
    try {
      const stats = await sharp(imageBuffer).stats();
      const totalStddev = stats.channels.reduce((sum, ch) => sum + ch.stdev, 0) / stats.channels.length;
      const normalizedStddev = totalStddev / 255;

      const totalMean = stats.channels.reduce((sum, ch) => sum + ch.mean, 0) / stats.channels.length;
      const normalizedMean = totalMean / 255;

      const isLowVariance = normalizedStddev < 0.05;
      const isTooWhite = normalizedMean > 0.95;
      const isTooBlack = normalizedMean < 0.05;

      return isLowVariance && (isTooWhite || isTooBlack);
    } catch {
      return false;
    }
  }

  async finalOptimization(pdfBytes, tempFiles) {
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const optimizedBytes = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
      return Buffer.from(optimizedBytes);
    } catch (err) {
      return pdfBytes;
    }
  }

  getFileExtension(buffer) {
    if (buffer.length < 4) return '.bin';
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return '.pdf';
    }
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return '.jpg';
    }
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return '.png';
    }
    return '.bin';
  }

  async cleanupTempFiles(tempFiles) {
    for (const file of tempFiles) {
      try {
        if (fs.existsSync(file)) {
          await unlinkAsync(file);
        }
      } catch (err) {
        // Silent cleanup
      }
    }
  }

  errorResponse(code, message, retryPossible, requestId = null) {
    return {
      success: false,
      data: null,
      error: {
        code,
        message,
        suggestion: this.getSuggestionForError(code),
        retryPossible: retryPossible !== false
      },
      meta: {
        contractVersion: 'v1',
        requestId,
        deprecated: TOOL_DEPRECATED,
        deprecationWarning: TOOL_DEPRECATED ? DEPRECATION_WARNING : null
      }
    };
  }

  getSuggestionForError(code) {
    const suggestions = {
      'VALIDATION_FAILED': 'Check your input files and try again.',
      'EXECUTION_ERROR': 'Please try again. If the problem persists, contact support.',
      'EXECUTION_TIMEOUT': 'Try with smaller images or fewer pages.',
      'STORAGE_ERROR': 'Please retry in a few moments.',
      'CONSENT_REQUIRED': 'Accept the terms and conditions to proceed.'
    };
    return suggestions[code] || 'Please try again or contact support if the problem persists.';
  }
}

module.exports = PACSEKYCEngine;