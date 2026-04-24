# Use Node.js 18 slim for smaller image with native compilation support
# Cache bust: ensure fresh build after fixing await syntax error
FROM node:18-slim AS builder

# Build argument to force cache invalidation on each deployment
ARG CACHE_BUST=1

# Install dependencies for native modules (sharp)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Production stage
FROM node:18-slim

# Install runtime dependencies for sharp (optional)
RUN apt-get update && apt-get install -y \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app ./

# Railway injects PORT at runtime; the app listens on 0.0.0.0:$PORT.

# Start command
CMD ["npm", "start"]
