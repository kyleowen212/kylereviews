FROM node:20-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN npx prisma generate

ARG DATABASE_URL="file:./build-placeholder.db"
RUN npx prisma db push --skip-generate 2>/dev/null; npm run build

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && node prisma/seed.js; npm start"]