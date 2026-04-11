# --- Stage 1: build (all deps + TypeScript compile) ---
FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Stage 2: production (compiled app + prod deps only) ---
FROM node:24-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 -G nodejs nestjs

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 4000

CMD ["node", "dist/main.js"]