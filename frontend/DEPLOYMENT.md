# Deployment Guide

## Vercel Deployment

### Prerequisites
1. Vercel account
2. GitHub repository connected
3. Environment variables set

### Steps
1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Select the `frontend` directory as root

2. **Environment Variables**
   - Add the following environment variables in Vercel dashboard:
     - `NEXT_PUBLIC_API_URL`: `https://sahakarhelp-production.up.railway.app`
     - `NODE_ENV`: `production`

3. **Build Settings**
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

4. **Deploy**
   - Click "Deploy"
   - Vercel will automatically deploy on every push to main branch

## Railway Deployment (Backend)

### Prerequisites
1. Railway account
2. MongoDB Atlas database

### Steps
1. **Connect Repository**
   - Go to [railway.app](https://railway.app)
   - New Project → Deploy from GitHub repo
   - Select `backend` directory

2. **Environment Variables**
   - Add `MONGO_URI` with your MongoDB connection string
   - Add `PORT` (optional, defaults to 8080)

3. **Deploy**
   - Railway will automatically deploy
   - Get the generated URL and update frontend's `NEXT_PUBLIC_API_URL`

## Local Development

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
npm start
```

## Verification

After deployment, verify:
1. Homepage loads at `/`
2. Test page works at `/test`
3. API connection works (green status on test page)
4. Tools are listed on homepage

## Troubleshooting

### 404 Errors
- Check Vercel project settings (root directory should be `frontend`)
- Verify routes exist in `app/` directory
- Check build logs for errors

### API Connection Failed
- Verify backend is running on Railway
- Check `NEXT_PUBLIC_API_URL` environment variable
- Test backend directly at `{backend_url}/api/test`

### Build Failures
- Check Node.js version (requires 18+)
- Verify all dependencies in `package.json`
- Check for TypeScript errors if applicable