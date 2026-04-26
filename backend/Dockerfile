FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npx prisma generate
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npx tsx src/index.ts"]
