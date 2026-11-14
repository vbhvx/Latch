# syntax=docker/dockerfile:1.7

# ---- build: install all deps and compile TypeScript ----
FROM node:25-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY db ./db
COPY tsconfig.build.json ./
RUN npm run build \
    && npm prune --omit=dev

# ---- runtime: production deps + compiled output only, non-root ----
FROM node:25-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN apk add --no-cache tini
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node db/migrations ./dist/db/migrations
COPY --chown=node:node package.json ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health/liveness').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/src/server.js"]
