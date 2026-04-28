'use strict';

const express = require('express');
const router = express.Router();
const analyticsService = require('../services/EKYCAnalyticsService');

router.get('/download/:fileKey', async (req, res) => {
  const { fileKey } = req.params;
  const userId = req.user?.id || req.query.userId || null;
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

  try {
    if (analyticsService && analyticsService.trackDownload) {
      await analyticsService.trackDownload({
        toolSlug: 'pacs_ekyc_tool',
        userId,
        fileKey,
        timestamp: new Date(),
        ipAddress: clientIp
      });
    }

    res.status(403).json({
      success: false,
      error: {
        code: 'DIRECT_ACCESS_FORBIDDEN',
        message: 'Direct file access is not allowed. Use the signed URL provided by the tool execution response.'
      },
      meta: { contractVersion: 'v1' }
    });
  } catch (err) {
    console.error('[PACS Download Audit] Error:', err.message);
    res.status(500).json({
      success: false,
      error: { code: 'AUDIT_ERROR', message: 'Failed to process download request' },
      meta: { contractVersion: 'v1' }
    });
  }
});

module.exports = router;