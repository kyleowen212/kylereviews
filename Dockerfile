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

CMD ["sh", "-c", "npx prisma db push --skip-generate && node -e \"const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.admin.findFirst().then(a=>{if(!a){require('child_process').execSync('node prisma/seed.js',{stdio:'inherit'})}}).finally(()=>p.\\$disconnect())\" && npx next start -H 0.0.0.0 -p ${PORT:-3000}"]