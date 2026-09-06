FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.22.0 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/server/ ./apps/server/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @metatile-queue-populator-ui/server build

FROM node:22-alpine AS runner

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV SERVER_PORT=8080

WORKDIR /usr/src/app

COPY apps/server/package.json ./
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/dist/config ./dist/config
COPY --from=builder /app/apps/server/dist/assets ./dist/assets
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server/node_modules ./dist/node_modules

RUN chown -R 1001:0 /usr/src/app && chmod -R g=u /usr/src/app

USER 1001
EXPOSE 8080

WORKDIR /usr/src/app/dist

CMD ["dumb-init", "node", "--import", "./instrumentation.mjs", "./index.js"]
