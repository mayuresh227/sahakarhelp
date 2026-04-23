# SahakarHelp Project - Warp Terminal Configuration

This file contains useful commands, aliases, and setup instructions for working with the SahakarHelp Tool Builder project in Warp terminal.

## Project Overview

SahakarHelp is a modular tool building platform with:
- **Backend**: Node.js/Express with MongoDB
- **Frontend**: Next.js with Tailwind CSS
- **Tool Registry**: Dynamic tool registration and execution system
- **Multiple Engines**: Calculator, Document, PDF, Image processing

## Quick Start Commands

### Development Setup
```bash
# Clone and navigate to project
cd ~/projects/SahakarHelp

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies  
cd ../frontend && npm install

# Start MongoDB (if not running)
sudo systemctl start mongod
# or
mongod --dbpath ~/data/db

# Start both servers (in separate terminals)
cd backend && npm start
cd frontend && npm run dev
```

### One-Line Setup
```bash
# Full project setup
cd ~/projects/SahakarHelp && cd backend && npm install && cd ../frontend && npm install && echo "Setup complete"
```

## Warp Aliases

Add these to your Warp `.zshrc` or `.bashrc`:

```bash
# SahakarHelp project aliases
alias sah-backend="cd ~/projects/SahakarHelp/backend"
alias sah-frontend="cd ~/projects/SahakarHelp/frontend"
alias sah-root="cd ~/projects/SahakarHelp"

# Development commands
alias sah-dev="cd ~/projects/SahakarHelp && tmux new-session -d 'cd backend && npm start' \; split-window -h 'cd frontend && npm run dev' \; attach"
alias sah-start="cd ~/projects/SahakarHelp/backend && npm start"
alias sah-front="cd ~/projects/SahakarHelp/frontend && npm run dev"

# Database commands
alias sah-mongo="mongosh sahakarhelp"
alias sah-mongo-start="sudo systemctl start mongod"
alias sah-mongo-stop="sudo systemctl stop mongod"

# Testing commands
alias sah-test="cd ~/projects/SahakarHelp/backend && npm test"
alias sah-test-tool="cd ~/projects/SahakarHelp/backend && node test_image_cropper.js"
```

## Common Workflows

### 1. Creating a New Tool
```bash
# Navigate to project
sah-root

# 1. Add tool metadata to backend/initToolRegistry.js
code backend/initToolRegistry.js

# 2. Implement engine method in appropriate engine file
code backend/engines/ImageEngine.js  # for image tools

# 3. Create frontend UI component (if specialized)
code frontend/src/components/NewToolUI.js

# 4. Update ToolLoader to use new component
code frontend/src/components/ToolLoader.js

# 5. Restart servers and test
sah-start  # in one terminal
sah-front  # in another terminal
```

### 2. Testing Image Cropper Tool
```bash
# Test backend registration
cd backend
node -e "const ToolRegistry = require('./initToolRegistry'); setTimeout(() => { console.log('Image Cropper:', ToolRegistry.getTool('image-cropper') ? 'Found' : 'Not found'); }, 2000);"

# Test API endpoint
curl http://localhost:3001/api/tools/image-cropper/config

# Test with sample image (requires curl with form-data)
curl -X POST -F "image=@test.jpg" -F "cropType=square" http://localhost:3001/api/tools/image-cropper
```

### 3. Database Operations
```bash
# Connect to MongoDB
sah-mongo

# View all tools in database
db.toolmetadatas.find()

# Reset database (delete and reseed)
db.toolmetadatas.deleteMany({})
# Then restart backend server to reseed
```

## Environment Variables

Create `.env` files:

### Backend (.env in backend/)
```bash
MONGODB_URI=mongodb://localhost:27017/sahakarhelp
PORT=3001
NODE_ENV=development
```

### Frontend (.env.local in frontend/)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Debugging Commands

### Check Server Status
```bash
# Check if backend is running
curl -I http://localhost:3001/api/tools

# Check if frontend is running
curl -I http://localhost:3000

# Check MongoDB connection
mongosh --eval "db.adminCommand('ping')"
```

### View Logs
```bash
# Backend logs
tail -f backend/server.log  # if logging to file
# or check terminal output

# Frontend logs
cd frontend && npm run dev  # shows logs in terminal

# MongoDB logs
tail -f /var/log/mongodb/mongod.log
```

### Process Management
```bash
# Find and kill node processes
ps aux | grep node
pkill -f "node server.js"
pkill -f "next dev"

# Restart all services
sah-mongo-stop && sah-mongo-start && sleep 2 && sah-start & sah-front &
```

## Useful Scripts

### test_tool.sh
```bash
#!/bin/bash
# Test tool registration and execution
cd ~/projects/SahakarHelp/backend
echo "Testing tool registration..."
node -e "
const ToolRegistry = require('./initToolRegistry');
setTimeout(() => {
  const tool = ToolRegistry.getTool('image-cropper');
  console.log('Tool:', tool ? tool.name : 'Not found');
  
  const engine = ToolRegistry.getEngine('image');
  console.log('Engine:', engine ? 'Found' : 'Not found');
}, 2000);
"
```

### reset_db.sh
```bash
#!/bin/bash
# Reset database and restart servers
cd ~/projects/SahakarHelp
echo "Resetting database..."
mongosh sahakarhelp --eval "db.toolmetadatas.deleteMany({})"
echo "Restarting backend..."
pkill -f "node server.js"
cd backend && npm start &
echo "Database reset complete. Tools will be reseeded on server start."
```

## Development Tips

### Hot Reloading
- Backend: Uses nodemon for automatic restart on file changes
- Frontend: Next.js has built-in hot reloading
- MongoDB: No restart needed for schema changes

### Testing Image Tools
1. Keep sample images in `~/projects/SahakarHelp/test-images/`
2. Use different formats: JPG, PNG, WEBP
3. Test with various sizes: small (100KB), medium (1MB), large (5MB+)

### Tool Development Cycle
```bash
# 1. Make changes to backend
code backend/engines/ImageEngine.js

# 2. Restart backend (auto with nodemon)
# 3. Test API with curl or Postman
curl -X POST -F "image=@test.jpg" http://localhost:3001/api/tools/image-cropper

# 4. Make changes to frontend
code frontend/src/components/ImageCropperUI.js

# 5. Frontend hot reloads automatically
# 6. Test in browser at http://localhost:3000/tools/image-cropper
```

## Performance Monitoring

```bash
# Monitor memory usage
top -o %MEM | grep node

# Monitor MongoDB
mongostat

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/api/tools
```

## Deployment Commands

### Build for Production
```bash
# Build frontend
cd frontend && npm run build

# Start production server
cd backend && NODE_ENV=production npm start
```

### Docker Commands (if using Docker)
```bash
# Build and run with Docker Compose
docker-compose up --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Troubleshooting

### Common Issues and Solutions

1. **MongoDB connection refused**
   ```bash
   # Start MongoDB service
   sudo systemctl start mongod
   
   # Check if MongoDB is running
   systemctl status mongod
   ```

2. **Port already in use**
   ```bash
   # Find process using port 3001
   lsof -i :3001
   
   # Kill the process
   kill -9 <PID>
   ```

3. **Node modules missing**
   ```bash
   # Reinstall dependencies
   cd backend && rm -rf node_modules package-lock.json && npm install
   cd ../frontend && rm -rf node_modules package-lock.json && npm install
   ```

4. **Tool not appearing in registry**
   ```bash
   # Check MongoDB connection
   mongosh sahakarhelp --eval "db.toolmetadatas.find({slug: 'image-cropper'})"
   
   # Restart backend to reseed
   pkill -f "node server.js"
   cd backend && npm start
   ```

## Project Structure Reference

```
~/projects/SahakarHelp/
├── backend/
│   ├── engines/           # Engine implementations
│   ├── models/           # MongoDB models
│   ├── routes/           # Express routes
│   ├── services/         # Core services
│   ├── initToolRegistry.js  # Tool initialization
│   └── server.js         # Main server
├── frontend/
│   ├── src/app/          # Next.js app router
│   ├── src/components/   # React components
│   └── src/services/     # Frontend services
└── plans/               # Architecture docs
```

## Useful Links

- Local Development: http://localhost:3000
- Backend API: http://localhost:3001/api/tools
- MongoDB GUI: http://localhost:27017 (use mongosh or Compass)
- API Documentation: See `plans/tool_registry_architecture.md`

## Warp-Specific Features

### Workflows
Create reusable workflows in Warp for common tasks:

1. **Full Development Start**
   ```yaml
   name: Start SahakarHelp Dev
   commands:
     - cd ~/projects/SahakarHelp/backend && npm start
     - cd ~/projects/SahakarHelp/frontend && npm run dev
   ```

2. **Database Reset**
   ```yaml
   name: Reset Database
   commands:
     - mongosh sahakarhelp --eval "db.toolmetadatas.deleteMany({})"
     - echo "Database cleared. Restart backend to reseed."
   ```

### AI Commands
Use Warp AI with project context:
- "How do I add a new image tool?"
- "Debug MongoDB connection issue"
- "Test the image cropper API"

### Split Panes
Use split panes for simultaneous monitoring:
```bash
# Left: Backend logs
cd backend && npm start

# Right: Frontend logs  
cd frontend && npm run dev

# Bottom: MongoDB shell
mongosh sahakarhelp
```

---

*Last updated: $(date)*  
*Project: SahakarHelp Tool Builder*  
*Use `sah-root` to navigate to project directory*