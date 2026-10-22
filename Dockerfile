FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package manifests
COPY package.json pnpm-lock.yaml* ./
COPY patches ./patches

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source files
COPY . .

# Build client and server
RUN pnpm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install pnpm
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* ./
COPY patches ./patches

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod

# Copy compiled files from builder
COPY --from=builder /app/dist ./dist

# Create uploads directory for persistent storage
RUN mkdir -p uploads/patient-records

EXPOSE 3000

CMD ["node", "dist/index.js"]
