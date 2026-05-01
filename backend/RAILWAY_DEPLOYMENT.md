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
  "database": "connected"
}
```

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

## Required Environment Variables

Configure these in **Railway dashboard** → Service → Variables.

### API Service (`sahakar-api`)

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | `production` | Yes |
| `PORT` | Server port (default: 3001) | No |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `REDIS_HOST` | Redis host | Yes |
| `REDIS_PORT` | Redis port | No (default: 6379) |
| `REDIS_PASSWORD` | Redis password | If auth enabled |
| `JWT_SECRET` | Min 32 chars | Yes |
| `SESSION_SECRET` | Min 32 chars | Yes |
| `NEXTAUTH_SECRET` | Min 32 chars | Yes |
| `NEXTAUTH_URL` | Public URL | Yes |

### Worker Service (`sahakar-worker`)

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | `production` | Yes |
| `REDIS_HOST` | Redis host | Yes |
| `REDIS_PORT` | Redis port | No (default: 6379) |
| `REDIS_PASSWORD` | Redis password | If auth enabled |
| `MONGODB_URI` | MongoDB connection string | Yes |

---

## Important Notes

### DO NOT Use .env Files

- Remove any `.env.production` references
- All environment variables must be set via Railway dashboard
- The `startWorker.js` script no longer loads `.env` files

### Startup Validation

The API server validates on startup:
- `NODE_ENV` must be defined
- `JWT_SECRET`, `SESSION_SECRET`, `NEXTAUTH_SECRET` must be ≥32 characters in production
- Placeholder values (containing "placeholder", "changeme", etc.) are rejected

### Startup Logs

API Service logs on successful start:
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

Worker Service logs on successful start:
```
========================================
[Worker] Starting Tool Execution Worker
[Worker] =======================================
[Worker] NODE_ENV: production
[Worker] Redis Host: your-redis-host
[Worker] Redis Port: 6379
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
3. Verify MongoDB URI is correct
4. Verify all required secrets are ≥32 characters

### Worker Not Processing Jobs

1. Verify Redis connection in logs
2. Check worker service is running
3. Verify `REDIS_HOST` matches API service

### MongoDB Connection Issues

1. Verify `MONGODB_URI` format: `mongodb+srv://user:pass@host/db`
2. Check IP whitelist in MongoDB Atlas
3. Verify database user credentials

---

## Validation Checklist

- [ ] API service starts successfully
- [ ] Worker service starts successfully
- [ ] Health check returns `{"status": "ok"}`
- [ ] MongoDB connects (check logs)
- [ ] Redis connects (check logs)
- [ ] No `.env` files are used in production