FROM node:18

# Install system deps for sharp
RUN apt-get update && apt-get install -y \
    libvips-dev \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV PORT=8080

# Verify sharp installation
RUN npm run sharp:verify

CMD ["npm", "start"]