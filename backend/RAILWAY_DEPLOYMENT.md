# Railway Deployment Guide

## Overview

SahakarHelp backend uses a dual-service architecture:
- **API Service**: Express server handling HTTP requests
- **Worker Service**: BullMQ worker processing background jobs

---

## Service 1: API Service (sahakar-api)

### Configuration

```json
{
  "deploy": {
    "startCommand": "NODE_ENV=production node server.js",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 30,
    "healthcheckInterval": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3,
    "zeroDowntime": true
  }
}
```

### Health Check Endpoint

`GET /api/health` returns:
```json
{
  "status": "ok",
  "uptime": 12345.67,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Note:** Health check is independent of database connection - returns `ok` even if MongoDB is temporarily unavailable.

---

## Service 2: Worker Service (sahakar-worker)

### Configuration

| Setting | Value |
|---------|-------|
| Service Name | `sahakar-worker` |
| Start Command | `NODE_ENV=production node startWorker.js` |
| Health Check | Not required (background service) |

### Deployment Steps

1. In Railway dashboard, click **Add New Service**
2. Select **Empty Service**
3. Name it `sahakar-worker`
4. Under **Settings** → **Deploy**, set:
   - **Start Command**: `NODE_ENV=production node startWorker.js`
5. Add required environment variables (see below)

---

## Standardized Environment Variables

**IMPORTANT:** All services MUST use identical environment variables. No exceptions.

### Required Variables (Both Services)

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@host/db` |
| `REDIS_URL` | Redis connection URL | `redis://user:pass@host:port` |

### Required Variables (API Only)

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | JWT signing secret (min 32 chars) | `your-32-char-secret-here...` |
| `SESSION_SECRET` | Session secret (min 32 chars) | `your-32-char-secret-here...` |
| `NEXTAUTH_SECRET` | NextAuth secret (min 32 chars) | `your-32-char-secret-here...` |
| `NEXTAUTH_URL` | Public API URL | `https://api.sahakarhelp.com` |
| `FRONTEND_URL` | Public frontend URL | `https://sahakarhelp.com` |
| `PORT` | Server port (optional, default: 3001) | `3001` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MAX_FILE_SIZE_MB` | Max upload size | `10` |

---

## Environment Variable Reference

### DO NOT USE (Deprecated)

These variables are **no longer supported**:
- `MONGODB_URI` → Use `MONGO_URI`
- `REDIS_HOST` → Use `REDIS_URL`
- `REDIS_PORT` → Use `REDIS_URL`
- `REDIS_PASSWORD` → Use `REDIS_URL` (include in URL)

### REDIS_URL Format

```
redis://user:password@host:port
rediss://user:password@host:port  (TLS)
```

Example:
```
redis://default:abc123@redis.railway.app:6379
```

### MONGO_URI Format

```
mongodb+srv://user:password@host/db
mongodb://user:password@host:port/db
```

---

## Startup Validation

The API server validates on startup:

1. `NODE_ENV` must be defined
2. `MONGO_URI` must be set
3. `REDIS_URL` must be set (no fallback)
4. `JWT_SECRET`, `SESSION_SECRET`, `NEXTAUTH_SECRET` must be ≥32 characters in production
5. Placeholder values (containing "placeholder", "changeme", etc.) are rejected

If validation fails, the server exits with a clear error message.

---

## Startup Logs

### API Service (on success)
```
[Server] =======================================
[Server] Production mode: ENFORCED
[Server] Environment: production
[Server] Server running on port 3001
[Server] MongoDB: connected
[Server] Redis: connected
[Server] Tool Registry initialized
[Server] API ready at http://localhost:3001
[Server] =======================================
```

### Worker Service (on success)
```
========================================
[Worker] Starting Tool Execution Worker
[Worker] =======================================
[Worker] NODE_ENV: production
[Worker] Redis URL: configured
========================================
[Worker] Initializing worker...
[Worker] Worker is ready and waiting for jobs
[Worker] =======================================
```

---

## Troubleshooting

### Health Check Fails

1. Check logs for startup errors
2. Verify `NODE_ENV=production` is set
3. Verify `MONGO_URI` is correct
4. Verify `REDIS_URL` is correct format
5. Verify all required secrets are ≥32 characters

### Worker Not Processing Jobs

1. Verify Redis URL in logs shows "configured"
2. Check worker service is running
3. Verify `REDIS_URL` matches API service

### MongoDB Connection Issues

1. Verify `MONGO_URI` format: `mongodb+srv://user:pass@host/db`
2. Check IP whitelist in MongoDB Atlas
3. Verify database user credentials

---

## Validation Checklist

- [ ] API service starts successfully
- [ ] Worker service starts successfully
- [ ] Health check returns `{"status": "ok"}`
- [ ] MongoDB connects (check logs)
- [ ] Redis connects (check logs)
- [ ] No deprecated env vars used (MONGODB_URI, REDIS_HOST, REDIS_PORT, REDIS_PASSWORD)
- [ ] Both services use identical MONGO_URI and REDIS_URL