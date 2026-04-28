const express = require('express');
const mongoose = require('mongoose');
const JobResult = require('../models/JobResult');
const { getJobStatus } = require('../queues/toolQueue');

const router = express.Router();

/**
 * GET /api/jobs/:jobId
 * Get job status and result
 */
router.get('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        error: 'Job ID is required',
      });
    }

    // Try to get from database first
    let jobResult = await JobResult.findOne({ jobId }).lean();

    if (!jobResult) {
      // Fall back to queue status
      const queueStatus = await getJobStatus(jobId);

      if (!queueStatus) {
        return res.status(404).json({
          success: false,
          error: 'Job not found',
        });
      }

      return res.json({
        success: true,
        jobId: queueStatus.jobId,
        status: queueStatus.status,
        progress: queueStatus.progress,
        data: queueStatus.data,
        result: queueStatus.result,
        error: queueStatus.failedReason,
        attemptsMade: queueStatus.attemptsMade,
        processedOn: queueStatus.processedOn,
        finishedOn: queueStatus.finishedOn,
      });
    }

    // Return from database
    res.json({
      success: true,
      jobId: jobResult.jobId,
      toolSlug: jobResult.toolSlug,
      status: jobResult.status,
      result: jobResult.result,
      error: jobResult.error,
      progress: jobResult.progress,
      attemptsMade: jobResult.attemptsMade,
      createdAt: jobResult.createdAt,
      updatedAt: jobResult.updatedAt,
      completedAt: jobResult.completedAt,
    });
  } catch (err) {
    console.error('Error fetching job status:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job status',
    });
  }
});

/**
 * GET /api/jobs
 * List jobs (with optional filters)
 */
router.get('/', async (req, res) => {
  try {
    const { userId, status, toolSlug, limit = 20, offset = 0 } = req.query;

    const filter = {};
    if (userId) filter.userId = userId;
    if (status) filter.status = status;
    if (toolSlug) filter.toolSlug = toolSlug;

    const jobs = await JobResult.find(filter)
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean();

    const total = await JobResult.countDocuments(filter);

    res.json({
      success: true,
      jobs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + jobs.length < total,
      },
    });
  } catch (err) {
    console.error('Error listing jobs:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to list jobs',
    });
  }
});

module.exports = router;