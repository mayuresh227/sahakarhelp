'use strict';

const Analytics = require('../models/Analytics');
const ExecutionLogger = require('./ExecutionLogger');

const ANALYTICS_BATCH_SIZE = 100;
const FLUSH_INTERVAL_MS = 60000;
const MAX_CONCURRENT_JOBS_PER_USER = 2;

const SLA_FAILURE_RATE_THRESHOLD = 0.1;
const SLA_SIZE_LIMIT_THRESHOLD = 0.15;
const SLA_WINDOW_MS = 300000;

class EKYCAnalyticsService {
  constructor() {
    this.pendingMetrics = [];
    this.pendingConsent = [];
    this.flushTimer = null;
    this.activeJobs = new Map();
    this.slaWindow = [];
    this.slaWebhookUrl = process.env.SLA_WEBHOOK_URL || null;
    this.startFlushTimer();
  }

  startFlushTimer() {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      this.flush();
      this.flushConsent();
    }, FLUSH_INTERVAL_MS);
  }

  stopFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  checkConcurrencyLimit(userId) {
    if (!userId) return true;
    const userJobs = this.activeJobs.get(userId) || 0;
    return userJobs < MAX_CONCURRENT_JOBS_PER_USER;
  }

  incrementActiveJobs(userId) {
    if (!userId) return;
    const current = this.activeJobs.get(userId) || 0;
    this.activeJobs.set(userId, current + 1);
  }

  decrementActiveJobs(userId) {
    if (!userId) return;
    const current = this.activeJobs.get(userId) || 0;
    if (current > 0) {
      this.activeJobs.set(userId, current - 1);
    }
  }

  async triggerSLAWebhook(alerts, requestId) {
    if (!this.slaWebhookUrl) {
      return;
    }

    const payload = {
      service: 'EKYCAnalyticsService',
      timestamp: new Date().toISOString(),
      requestId: requestId || 'system',
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
        console.warn(`[EKYCAnalytics] SLA webhook failed: ${response.status}`);
      } else {
        console.info(`[EKYCAnalytics] SLA webhook triggered for ${alerts.length} alerts`);
      }
    } catch (err) {
      console.warn(`[EKYCAnalytics] SLA webhook error: ${err.message}`);
    }
  }

  checkSLAThresholds() {
    const now = Date.now();
    this.slaWindow = this.slaWindow.filter(entry => now - entry.timestamp < SLA_WINDOW_MS);

    if (this.slaWindow.length < 10) return null;

    const failures = this.slaWindow.filter(e => !e.success).length;
    const sizeLimitFails = this.slaWindow.filter(e => e.sizeLimitNotMet).length;
    const failureRate = failures / this.slaWindow.length;
    const sizeLimitRate = sizeLimitFails / this.slaWindow.length;

    const alerts = [];

    if (failureRate > SLA_FAILURE_RATE_THRESHOLD) {
      alerts.push({
        type: 'failure_rate',
        rate: failureRate,
        threshold: SLA_FAILURE_RATE_THRESHOLD,
        windowSize: this.slaWindow.length,
        message: `Failure rate ${(failureRate * 100).toFixed(1)}% exceeds threshold ${SLA_FAILURE_RATE_THRESHOLD * 100}%`
      });
    }

    if (sizeLimitRate > SLA_SIZE_LIMIT_THRESHOLD) {
      alerts.push({
        type: 'size_limit_rate',
        rate: sizeLimitRate,
        threshold: SLA_SIZE_LIMIT_THRESHOLD,
        windowSize: this.slaWindow.length,
        message: `Size limit failure rate ${(sizeLimitRate * 100).toFixed(1)}% exceeds threshold ${SLA_SIZE_LIMIT_THRESHOLD * 100}%`
      });
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

    const alerts = this.checkSLAThresholds();
    if (alerts) {
      for (const alert of alerts) {
        console.warn('[EKYCAnalytics] SLA ALERT:', JSON.stringify(alert));
        if (ExecutionLogger && ExecutionLogger.log) {
          ExecutionLogger.log({
            level: 'warn',
            event: 'SLA_THRESHOLD_EXCEEDED',
            requestId: requestId || 'system',
            ...alert
          }).catch(() => {});
        }
        this.triggerSLAWebhook(alerts, requestId);
      }
    }
  }

  async trackConsent({ userId, toolSlug, timestamp, ipAddress, granted, consentVersion, consentText, requestId }) {
    const consentEntry = {
      userId: userId || null,
      toolSlug,
      timestamp,
      ipAddress: ipAddress || null,
      granted,
      consentVersion: consentVersion || null,
      consentText: consentText || null,
      eventType: granted ? 'CONSENT_GRANTED' : 'CONSENT_DENIED',
      requestId: requestId || null
    };

    this.pendingConsent.push(consentEntry);

    if (ExecutionLogger && ExecutionLogger.log) {
      ExecutionLogger.log({
        level: 'info',
        event: consentEntry.eventType,
        toolSlug,
        userId,
        consentVersion,
        requestId
      }).catch(() => {});
    }

    if (this.pendingConsent.length >= ANALYTICS_BATCH_SIZE) {
      await this.flushConsent();
    }
  }

  async trackExecution({ toolSlug, userId, success, sizeLimitNotMet, processingTimeMs, fileSizeKB, errorCode, requestId }) {
    const metric = {
      toolSlug,
      userId: userId || null,
      timestamp: new Date(),
      success,
      sizeLimitNotMet: sizeLimitNotMet || false,
      processingTimeMs,
      fileSizeKB: fileSizeKB || null,
      errorCode: errorCode || null,
      requestId: requestId || null
    };

    this.pendingMetrics.push(metric);

    if (this.pendingMetrics.length >= ANALYTICS_BATCH_SIZE) {
      await this.flush();
    }
  }

  async trackDownload({ toolSlug, userId, fileKey, timestamp, ipAddress, requestId }) {
    const auditEntry = {
      eventType: 'FILE_DOWNLOAD',
      toolSlug,
      userId: userId || null,
      fileKey,
      timestamp: timestamp || new Date(),
      ipAddress: ipAddress || null,
      requestId: requestId || null
    };

    try {
      if (ExecutionLogger && ExecutionLogger.log) {
        await ExecutionLogger.log({
          level: 'info',
          event: 'PACS_EKYC_DOWNLOAD',
          toolSlug,
          userId,
          fileKey,
          requestId,
          timestamp: auditEntry.timestamp
        });
      }
    } catch (err) {
      console.warn('[EKYCAnalytics] Download audit log failed:', err.message);
    }
  }

  async flush() {
    if (this.pendingMetrics.length === 0) return;

    const metrics = this.pendingMetrics.splice(0, this.pendingMetrics.length);

    try {
      const bulkOps = metrics.map(m => ({
        insertOne: { document: m }
      }));

      if (bulkOps.length > 0) {
        await Analytics.collection.bulkWrite(bulkOps, { ordered: false });
      }
    } catch (err) {
      console.error('[EKYCAnalytics] Failed to flush metrics:', err.message);
      this.pendingMetrics.unshift(...metrics);
    }
  }

  async flushConsent() {
    if (this.pendingConsent.length === 0) return;

    const consentRecords = this.pendingConsent.splice(0, this.pendingConsent.length);

    try {
      const bulkOps = consentRecords.map(c => ({
        insertOne: { document: c }
      }));

      if (bulkOps.length > 0) {
        await Analytics.collection.bulkWrite(bulkOps, { ordered: false });
      }
    } catch (err) {
      console.error('[EKYCAnalytics] Failed to flush consent:', err.message);
      this.pendingConsent.unshift(...consentRecords);
    }
  }

  async getStats(toolSlug, timeRangeHours = 24) {
    const since = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);

    const pipeline = [
      { $match: { toolSlug, timestamp: { $gte: since } } },
      { $group: {
        _id: null,
        totalExecutions: { $sum: 1 },
        successCount: { $sum: { $cond: ['$success', 1, 0] } },
        failureCount: { $sum: { $cond: ['$success', 0, 1] } },
        sizeLimitNotMetCount: { $sum: { $cond: ['$sizeLimitNotMet', 1, 0] } },
        avgProcessingTimeMs: { $avg: '$processingTimeMs' },
        avgFileSizeKB: { $avg: '$fileSizeKB' },
        minFileSizeKB: { $min: '$fileSizeKB' },
        maxFileSizeKB: { $max: '$fileSizeKB' }
      }}
    ];

    const results = await Analytics.collection.aggregate(pipeline).toArray();

    if (results.length === 0) {
      return {
        toolSlug,
        timeRangeHours,
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        sizeLimitNotMetCount: 0,
        avgProcessingTimeMs: 0,
        avgFileSizeKB: 0,
        successRate: 0
      };
    }

    const stats = results[0];
    return {
      toolSlug,
      timeRangeHours,
      totalExecutions: stats.totalExecutions,
      successCount: stats.successCount,
      failureCount: stats.failureCount,
      sizeLimitNotMetCount: stats.sizeLimitNotMetCount,
      avgProcessingTimeMs: Math.round(stats.avgProcessingTimeMs || 0),
      avgFileSizeKB: Math.round(stats.avgFileSizeKB || 0),
      minFileSizeKB: stats.minFileSizeKB || 0,
      maxFileSizeKB: stats.maxFileSizeKB || 0,
      successRate: stats.totalExecutions > 0
        ? Math.round((stats.successCount / stats.totalExecutions) * 10000) / 100
        : 0
    };
  }

  async getUserStats(userId, toolSlug, timeRangeHours = 24) {
    if (!userId) return null;

    const since = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);

    const pipeline = [
      { $match: { userId, toolSlug, timestamp: { $gte: since } } },
      { $group: {
        _id: null,
        totalExecutions: { $sum: 1 },
        successCount: { $sum: { $cond: ['$success', 1, 0] } },
        failureCount: { $sum: { $cond: ['$success', 0, 1] } },
        avgProcessingTimeMs: { $avg: '$processingTimeMs' },
        avgFileSizeKB: { $avg: '$fileSizeKB' }
      }}
    ];

    const results = await Analytics.collection.aggregate(pipeline).toArray();

    if (results.length === 0) {
      return {
        userId,
        toolSlug,
        timeRangeHours,
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        avgProcessingTimeMs: 0,
        avgFileSizeKB: 0
      };
    }

    const stats = results[0];
    return {
      userId,
      toolSlug,
      timeRangeHours,
      totalExecutions: stats.totalExecutions,
      successCount: stats.successCount,
      failureCount: stats.failureCount,
      avgProcessingTimeMs: Math.round(stats.avgProcessingTimeMs || 0),
      avgFileSizeKB: Math.round(stats.avgFileSizeKB || 0)
    };
  }

  async getConsentStats(toolSlug, timeRangeHours = 24) {
    const since = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);

    const pipeline = [
      { $match: { toolSlug, timestamp: { $gte: since }, eventType: { $in: ['CONSENT_GRANTED', 'CONSENT_DENIED'] } } },
      { $group: {
        _id: '$eventType',
        count: { $sum: 1 }
      }}
    ];

    const results = await Analytics.collection.aggregate(pipeline).toArray();

    const consentStats = {
      toolSlug,
      timeRangeHours,
      granted: 0,
      denied: 0
    };

    for (const result of results) {
      if (result._id === 'CONSENT_GRANTED') {
        consentStats.granted = result.count;
      } else if (result._id === 'CONSENT_DENIED') {
        consentStats.denied = result.count;
      }
    }

    return consentStats;
  }

  async getConsentHistory(userId, toolSlug, timeRangeHours = 24) {
    if (!userId) return null;

    const since = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);

    const records = await Analytics.find({
      userId,
      toolSlug,
      timestamp: { $gte: since },
      eventType: { $in: ['CONSENT_GRANTED', 'CONSENT_DENIED'] }
    })
    .select('eventType consentVersion consentText timestamp requestId')
    .sort({ timestamp: -1 })
    .limit(100)
    .lean();

    return {
      userId,
      toolSlug,
      timeRangeHours,
      records
    };
  }

  async shutdown() {
    this.stopFlushTimer();
    await this.flush();
    await this.flushConsent();
  }
}

const analyticsService = new EKYCAnalyticsService();

process.on('SIGTERM', async () => {
  await analyticsService.shutdown();
});

process.on('SIGINT', async () => {
  await analyticsService.shutdown();
});

module.exports = analyticsService;