const mongoose = require('mongoose');
const UserPlan = require('../models/UserPlan');
const ToolExecutionLog = require('../models/ToolExecutionLog');
const JobResult = require('../models/JobResult');
const CreditReservation = require('../models/CreditReservation');
const { getToolCost } = require('../config/toolCosts');

const guestUsageCache = new Map();

function getGuestId(ipAddress) {
  return `guest:${ipAddress || 'unknown'}`;
}

function needsReset(resetDate) {
  if (!resetDate) return true;
  return new Date() >= resetDate;
}

async function checkUsage(userId, toolSlug, ipAddress = null, options = {}) {
  const { requestId = null } = options || {};
  const cost = getToolCost(toolSlug);

  if (requestId) {
    console.log(`[${requestId}] Usage check: tool=${toolSlug}, userId=${userId || 'guest'}, cost=${cost}`);
  }

  if (!userId) {
    const guestId = getGuestId(ipAddress);
    const guestData = guestUsageCache.get(guestId) || { dailyCredits: 5, lastReset: new Date() };

    const today = new Date().toDateString();
    if (guestData.lastReset.toDateString() !== today) {
      guestData.dailyCredits = 5;
      guestData.lastReset = new Date();
    }

    const allowed = guestData.dailyCredits >= cost;
    return {
      allowed,
      remainingCredits: guestData.dailyCredits,
      planName: 'guest',
    };
  }

  const plan = await UserPlan.getOrCreate(userId);

  if (needsReset(plan.resetDate)) {
    await UserPlan.resetCredits(userId);
    const updatedPlan = await UserPlan.findOne({ userId });
    const allowed = updatedPlan.creditsRemaining >= cost;
    return {
      allowed,
      remainingCredits: updatedPlan.creditsRemaining,
      planName: updatedPlan.planName,
    };
  }

  const allowed = plan.creditsRemaining >= cost;
  return {
    allowed,
    remainingCredits: plan.creditsRemaining,
    planName: plan.planName,
  };
}

async function consumeCredits(userId, toolSlug, ipAddress = null, options = {}) {
  const { requestId = null } = options || {};
  const cost = getToolCost(toolSlug);

  if (requestId) {
    const alreadyProcessed = await checkRequestIdProcessed(requestId);
    if (alreadyProcessed) {
      console.log(`[${requestId}] Credits already consumed, skipping (idempotency)`);
      const plan = userId
        ? await UserPlan.findOne({ userId })
        : null;
      return {
        success: true,
        remainingCredits: plan?.creditsRemaining || 5,
        idempotent: true
      };
    }
  }

  if (requestId) {
    console.log(`[${requestId}] Consuming credits: tool=${toolSlug}, userId=${userId || 'guest'}, cost=${cost}`);
  }

  if (!userId) {
    const guestId = getGuestId(ipAddress);
    const guestData = guestUsageCache.get(guestId) || { dailyCredits: 5, lastReset: new Date() };

    const today = new Date().toDateString();
    if (guestData.lastReset.toDateString() !== today) {
      guestData.dailyCredits = 5;
      guestData.lastReset = new Date();
    }

    if (guestData.dailyCredits < cost) {
      return { success: false, remainingCredits: guestData.dailyCredits };
    }

    guestData.dailyCredits -= cost;
    guestUsageCache.set(guestId, guestData);

    if (requestId) {
      await markRequestIdProcessed(requestId);
    }

    return { success: true, remainingCredits: guestData.dailyCredits };
  }

  const result = await UserPlan.findOneAndUpdate(
    {
      userId,
      creditsRemaining: { $gte: cost },
    },
    {
      $inc: { creditsRemaining: -cost },
      $set: { updatedAt: new Date() },
    },
    { new: true }
  );

  if (!result) {
    const plan = await UserPlan.findOne({ userId });
    return {
      success: false,
      remainingCredits: plan?.creditsRemaining || 0,
    };
  }

  if (requestId) {
    await markRequestIdProcessed(requestId);
  }

  return { success: true, remainingCredits: result.creditsRemaining };
}

async function reserveCredits(userId, toolSlug, ipAddress = null, options = {}) {
  const { requestId = null } = options || {};
  const cost = getToolCost(toolSlug);

  if (!requestId) {
    throw new Error('requestId is required for credit reservation');
  }

  const existing = await CreditReservation.findOne({ requestId }).lean();
  if (existing) {
    if (existing.status === 'consumed') {
      return { success: true, reservationId: existing._id.toString(), remainingCredits: 0, idempotent: true };
    }
    if (existing.status === 'refunded') {
      return { success: false, reservationId: null, remainingCredits: 0, error: 'already_refunded' };
    }
    return { success: true, reservationId: existing._id.toString(), remainingCredits: 0, idempotent: true };
  }

  if (!userId) {
    const guestId = getGuestId(ipAddress);
    const guestData = guestUsageCache.get(guestId) || { dailyCredits: 5, lastReset: new Date() };
    const today = new Date().toDateString();
    if (guestData.lastReset.toDateString() !== today) {
      guestData.dailyCredits = 5;
      guestData.lastReset = new Date();
    }
    if (guestData.dailyCredits < cost) {
      return { success: false, reservationId: null, remainingCredits: guestData.dailyCredits };
    }
    guestData.dailyCredits -= cost;
    guestUsageCache.set(guestId, guestData);

    const reservation = new CreditReservation({
      requestId,
      userId: null,
      toolSlug,
      creditsUsed: cost,
      status: 'pending'
    });
    await reservation.save();

    return { success: true, reservationId: reservation._id.toString(), remainingCredits: guestData.dailyCredits };
  }

  const result = await UserPlan.findOneAndUpdate(
    { userId, creditsRemaining: { $gte: cost } },
    { $inc: { creditsRemaining: -cost }, $set: { updatedAt: new Date() } },
    { new: true }
  );

  if (!result) {
    const plan = await UserPlan.findOne({ userId });
    return { success: false, reservationId: null, remainingCredits: plan?.creditsRemaining || 0 };
  }

  const reservation = new CreditReservation({
    requestId,
    userId,
    toolSlug,
    creditsUsed: cost,
    status: 'pending'
  });
  await reservation.save();

  return { success: true, reservationId: reservation._id.toString(), remainingCredits: result.creditsRemaining };
}

async function finalizeReservation(reservationId) {
  if (!reservationId) return false;

  const result = await CreditReservation.findOneAndUpdate(
    { _id: reservationId, status: 'pending' },
    { $set: { status: 'consumed', updatedAt: new Date() } }
  );

  return !!result;
}

async function releaseReservation(reservationId, userId, toolSlug, ipAddress = null) {
  if (!reservationId) {
    return { released: false, reason: 'no_reservation_id' };
  }

  const reservation = await CreditReservation.findOneAndUpdate(
    { _id: reservationId, status: 'pending' },
    { $set: { status: 'refunded', refundStatus: 'completed', updatedAt: new Date() } },
    { new: true }
  );

  if (!reservation) {
    const existing = await CreditReservation.findOne({ _id: reservationId }).lean();
    if (existing) {
      return { released: false, reason: existing.status === 'refunded' ? 'already_released' : 'invalid_status' };
    }
    return { released: false, reason: 'not_found' };
  }

  const cost = reservation.creditsUsed;

  if (!userId) {
    const guestId = getGuestId(ipAddress);
    const guestData = guestUsageCache.get(guestId);
    if (guestData) {
      guestData.dailyCredits += cost;
      guestUsageCache.set(guestId, guestData);
    }
    return { released: true, reason: 'guest_refunded' };
  }

  await UserPlan.findOneAndUpdate(
    { userId },
    { $inc: { creditsRemaining: cost }, $set: { updatedAt: new Date() } }
  );

  return { released: true, reason: 'credits_refunded' };
}

async function checkRequestIdProcessed(requestId) {
  try {
    const log = await ToolExecutionLog.findOne({ requestId, status: 'success' });
    if (log) return true;

    const jobResult = await JobResult.findOne({ requestId, status: 'completed' });
    return !!jobResult;
  } catch (err) {
    console.error(`[${requestId}] Idempotency check failed:`, err.message);
    return false;
  }
}

async function markRequestIdProcessed(requestId) {
  try {
    await JobResult.findOneAndUpdate(
      { requestId },
      { $setOnInsert: { requestId, status: 'credits_consumed', createdAt: new Date(), updatedAt: new Date() } },
      { upsert: true }
    );
  } catch (err) {
    console.error(`[${requestId}] Failed to mark as processed:`, err.message);
  }
}

async function refundCredits(userId, toolSlug, ipAddress = null, options = {}) {
  const { requestId = null } = options || {};
  const cost = getToolCost(toolSlug);

  if (requestId) {
    console.log(`[${requestId}] Refund attempt: tool=${toolSlug}, userId=${userId || 'guest'}, cost=${cost}`);
  }

  if (requestId) {
    const reservationUpdate = await CreditReservation.findOneAndUpdate(
      { requestId, refundStatus: { $ne: 'completed' } },
      {
        $set: {
          refundStatus: 'completed',
          status: 'refunded',
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!reservationUpdate) {
      const existing = await CreditReservation.findOne({ requestId }).lean();
      if (existing) {
        console.log(`[${requestId}] Refund skipped: already completed`);
        return { refunded: false, reason: 'already_refunded' };
      }
      return { refunded: false, reason: 'no_reservation' };
    }
  }

  if (!userId) {
    const guestId = getGuestId(ipAddress);
    const guestData = guestUsageCache.get(guestId);
    if (guestData) {
      guestData.dailyCredits += cost;
      guestUsageCache.set(guestId, guestData);
    }
    return { refunded: true, reason: 'guest_refunded' };
  }

  await UserPlan.findOneAndUpdate(
    { userId },
    {
      $inc: { creditsRemaining: cost },
      $set: { updatedAt: new Date() },
    }
  );

  return { refunded: true, reason: 'credits_refunded' };
}

async function getUserPlan(userId) {
  if (!userId) return null;
  return UserPlan.findOne({ userId });
}

async function setUserPlan(userId, planName) {
  const plan = await UserPlan.getOrCreate(userId, planName);
  return plan;
}

async function getReservationByRequestId(requestId) {
  if (!requestId) return null;
  return CreditReservation.findOne({ requestId }).lean();
}

async function getBillingHistory(userId, toolSlug = null, limit = 50) {
  const query = { userId };
  if (toolSlug) {
    query.toolSlug = toolSlug;
  }

  const reservations = await CreditReservation.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return {
    userId,
    toolSlug,
    reservations: reservations.map(r => ({
      requestId: r.requestId,
      toolSlug: r.toolSlug,
      creditsUsed: r.creditsUsed,
      status: r.status,
      createdAt: r.createdAt,
      completedAt: r.updatedAt
    }))
  };
}

module.exports = {
  checkUsage,
  consumeCredits,
  reserveCredits,
  finalizeReservation,
  releaseReservation,
  refundCredits,
  getUserPlan,
  setUserPlan,
  getGuestId,
  checkRequestIdProcessed,
  markRequestIdProcessed,
  getReservationByRequestId,
  getBillingHistory
};