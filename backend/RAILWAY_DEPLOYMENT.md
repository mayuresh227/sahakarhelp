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

2. **Configure the backend service**
   - Use one Railway service for the API.
   - Set **Root Directory** to `/backend`.
   - Set **Config File Path** to `/backend/railway.json`.
   - Set **Build Command** to `npm ci`.
   - Set **Start Command** to `npm start`.
   - Leave `PORT` unset unless you intentionally configure a matching public domain target port.

## Step 2: Environment Variables

Add these environment variables in Railway Dashboard → Project → Variables:

| Variable | Value | Required |
|----------|-------|----------|
| `PORT` | Leave unset | No. Railway injects this automatically |
| `MONGODB_URI` | Your MongoDB connection string | **Yes** |
| `NODE_ENV` | `production` | Recommended |
| `FRONTEND_URL` | Your frontend URL (e.g., `https://sahakarhelp.vercel.app`) | Recommended |
| `NEXTAUTH_SECRET` | Random 32+ character string | For auth |
| `JWT_SECRET` | Random secret string | For JWT |

### MongoDB URI Format
- For MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net/sahakarhelp?retryWrites=true&w=majority`
- Railway also offers MongoDB plugin (recommended)

## Step 3: Deployment Configuration

### Railway Configuration File
The backend service uses `backend/railway.json`:

```json
{
  "build": {
    "builder": "RAILPACK",
    "buildCommand": "npm ci"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/test",
    "healthcheckTimeout": 60
  }
}
```

### Important Settings
- **Public Networking**: In the backend service settings, generate a Railway domain under **Networking → Public Networking**.
- **Target Port**: Leave the domain target port automatic, or set it to the same value as the service `PORT`.
- **Port Binding**: The server must listen on `0.0.0.0` and `process.env.PORT`; `server.js` already does this.
- **Root Directory**: Must be `/backend`, not the project root.
- **Config File Path**: Must be `/backend/railway.json`; Railway config files do not automatically follow the root directory setting.

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

3. **Port Binding / Target Port Error**
   - Server must use `process.env.PORT` and bind to `0.0.0.0`.
   - Do not hard-code `PORT=3001` or `PORT=8080` in Railway variables unless the public domain target port is set to the exact same value.
   - If `/api/test` returns Railway's 502 JSON and the backend logs do not show `TEST HIT`, the request is not reaching this service.

4. **Root Directory Wrong**
   - Railway might deploy from `/` instead of `/backend`
   - Manually set root directory to `/backend` in service settings
   - Set config file path to `/backend/railway.json`

5. **Duplicate Services**
   - Delete or detach domains from stale/root services
   - Keep only one public domain on the backend API service
   - Ensure the frontend `NEXT_PUBLIC_API_URL` points to that backend domain

### Debug Logs
Our server.js includes debug logs:
- Server starting message
- PORT value
- MongoDB URI existence check
- NODE_ENV value

Check Railway logs for these messages.

### Sharp Native Module Support
Sharp is used for image processing. To ensure it loads correctly in Railway:

1. **Libvips Dependency**: The Dockerfile includes `libvips` runtime dependency. If using Nixpacks (default), ensure libvips is installed by adding `apt-get install libvips` in a custom build command.

2. **Postinstall Rebuild**: The package.json includes a `postinstall` script that runs `npm run sharp:verify`. This verifies sharp loads correctly. If sharp fails, the build will fail.

3. **Verification**:
   - After deployment, run `npm run sharp:verify` in the backend service shell.
   - Check logs for "Sharp version:" message.
   - Test the image tools endpoint (e.g., `/api/tools/image-compressor`) with a sample image.

4. **Troubleshooting**:
   - If sharp fails with "libvips" error, ensure the system has libvips installed (use Dockerfile).
   - If sharp fails due to missing native module, run `npm rebuild sharp` manually.
   - Ensure Node.js version matches sharp's prebuilt binaries (Node 18+).

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
