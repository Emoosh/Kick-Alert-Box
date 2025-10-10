# Multi-stage build for Next.js standalone deployment
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed  
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js with standalone output
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create nextjs user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install global dependencies as root
RUN npm install -g tsx prisma

# Copy built application
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/ws-server.ts ./
COPY --from=builder /app/node_modules ./node_modules

# Copy and set permissions for startup script
COPY start.sh ./
RUN chmod +x start.sh

# Change ownership to nextjs user
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose ports
EXPOSE 3000 4001

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start all processes
CMD ["./start.sh"]