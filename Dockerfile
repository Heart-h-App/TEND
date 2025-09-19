FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
# Remove migration from build time
RUN npm run build
RUN npm prune --production

FROM node:20-alpine

WORKDIR /app
COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY package.json .
COPY prisma prisma/

# Generate Prisma client
RUN npx prisma generate

# Copy startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 3000
ENV NODE_ENV=production
# Use the startup script instead of directly running the app
CMD ["/app/start.sh"]
