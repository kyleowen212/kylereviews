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
ARG DATABASE_URL="file:./build-placeholder.db"
RUN npx prisma db push --skip-generate 2>/dev/null; npm run build

# Expose port
EXPOSE 3000

# Start script: run migrations + seed if needed, then start
CMD ["sh", "-c", "npx prisma db push && node prisma/seed.js; npm start"]
```

The key change: `ENV` was setting a permanent environment variable in the container. `ARG` only exists during the build and disappears at runtime, so your Railway `DATABASE_URL` variable takes effect cleanly.

**2. Verify your Railway variable** — in Railway's dashboard, go to your service → **Variables** tab and confirm `DATABASE_URL` is set to exactly:
```
file:./kyle-reviews.db