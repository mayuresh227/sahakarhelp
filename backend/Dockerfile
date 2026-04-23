# Use Node.js 18 slim for smaller image with native compilation support
FROM node:18-slim AS builder

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

# Expose port
EXPOSE 3001

# Start command
CMD ["npm", "start"]