FROM node:18

# Install system deps for sharp and other native modules
RUN apt-get update && apt-get install -y \
    libvips-dev \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Rebuild sharp to ensure compatibility
RUN npm rebuild sharp

COPY . .

ENV PORT=8080
ENV NODE_ENV=production

# Verify sharp installation and log engine dependencies
RUN npm run sharp:verify

# Log engine loading status (optional)
RUN node -e "console.log('Dependencies installed successfully'); console.log('Sharp version:', require('sharp').versions ? require('sharp').versions.libvips : 'unknown'); console.log('PDF-lib available:', !!require('pdf-lib'))"

CMD ["npm", "start"]