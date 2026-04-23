# Railway Deployment Guide for SahakarHelp Backend

This guide ensures successful deployment of the backend on Railway.

## Prerequisites

1. Railway account (https://railway.app)
2. GitHub repository connected
3. MongoDB database (MongoDB Atlas recommended)

## Step 1: Project Setup on Railway

1. **Create New Project**
   - Go to [Railway Dashboard](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

2. **Configure Service**
   - Railway will auto-detect the backend directory
   - If not, manually set:
     - **Root Directory**: `backend`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Node Version**: 18.x (auto-detected from package.json)

## Step 2: Environment Variables

Add these environment variables in Railway Dashboard → Project → Variables:

| Variable | Value | Required |
|----------|-------|----------|
| `PORT` | `3001` | No (Railway auto-assigns) |
| `MONGODB_URI` | Your MongoDB connection string | **Yes** |
| `NODE_ENV` | `production` | Recommended |
| `FRONTEND_URL` | Your frontend URL (e.g., `https://sahakarhelp.vercel.app`) | Recommended |
| `NEXTAUTH_SECRET` | Random 32+ character string | For auth |
| `JWT_SECRET` | Random secret string | For JWT |

### MongoDB URI Format
- For MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net/sahakarhelp?retryWrites=true&w=majority`
- Railway also offers MongoDB plugin (recommended)

## Step 3: Deployment Configuration

### Railway Configuration File (Optional)
Create `railway.json` in backend directory for explicit configuration:

```json
{
  "build": {
    "builder": "nixpacks",
    "buildCommand": "npm install"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/test",
    "healthcheckTimeout": 60
  }
}
```

### Important Settings
- **Health Check**: Railway will automatically check `/` or `/api/test` endpoint
- **Port Binding**: Ensure server listens on `process.env.PORT`
- **Root Directory**: Must be `backend` (not project root)

## Step 4: Deploy

1. **Trigger Deployment**
   - Railway auto-deploys on git push to main branch
   - Or manually deploy from dashboard

2. **Monitor Logs**
   - Check deployment logs for errors
   - Look for "Server running on port" message
   - Verify MongoDB connection success

## Step 5: Verify Deployment

1. **Test Endpoints**
   - `GET /` - Should return "Backend is running 🚀"
   - `GET /api/test` - Should return JSON `{ message: "API working 🚀" }`

2. **Check Health**
   - Railway dashboard shows service status
   - Green = healthy, Red = failed

## Troubleshooting

### Common Issues

1. **Railpack Error**
   - Ensure `package.json` has correct `main` field (`server.js`)
   - Ensure `start` script exists (`node server.js`)
   - Check Node version compatibility (18.x)

2. **MongoDB Connection Failed**
   - Verify `MONGODB_URI` is set correctly
   - Check network access (allow all IPs in MongoDB Atlas)
   - Test connection locally with same URI

3. **Port Binding Error**
   - Server must use `process.env.PORT` (not hardcoded)
   - Our server.js already handles this

4. **Root Directory Wrong**
   - Railway might deploy from `/` instead of `/backend`
   - Manually set root directory to `backend` in service settings

5. **Duplicate Services**
   - Delete any extra services in Railway dashboard
   - Keep only one backend service

### Debug Logs
Our server.js includes debug logs:
- Server starting message
- PORT value
- MongoDB URI existence check
- NODE_ENV value

Check Railway logs for these messages.

## Production Recommendations

1. **Enable Auto-Deploy** from main branch
2. **Set up Custom Domain** in Railway
3. **Use Railway's MongoDB** plugin for easier management
4. **Configure Monitoring** with Railway insights
5. **Set up Backups** for MongoDB

## Connecting Frontend

Update frontend environment variable:
```env
NEXT_PUBLIC_API_URL=https://your-railway-app.up.railway.app
```

## Support

If issues persist:
1. Check Railway documentation: https://docs.railway.app
2. Examine deployment logs in Railway dashboard
3. Verify all environment variables are set
4. Test locally with same configuration

## Success Indicators

- ✅ Build completes without errors
- ✅ Server starts on assigned port
- ✅ MongoDB connects successfully
- ✅ `/api/test` endpoint returns 200 OK
- ✅ Railway dashboard shows "Healthy" status