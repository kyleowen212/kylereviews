FROM node:20-slim

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the application
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js (provide dummy DATABASE_URL so Prisma doesn't error during static analysis)
ENV DATABASE_URL="file:./build-placeholder.db"
RUN npx prisma db push --skip-generate 2>/dev/null; npm run build
ENV DATABASE_URL=""

# Expose port
EXPOSE 3000

# Start script: run migrations + seed if needed, then start
CMD ["sh", "-c", "npx prisma db push && node prisma/seed.js; npm start"]