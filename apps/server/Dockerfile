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

WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/server ./apps/server

RUN rm -f /app/apps/server/dist/config/local*.json /app/apps/server/config/local*.json

# Symlink /usr/src/app -> /app/apps/server so Helm ConfigMap volumeMount (/usr/src/app/dist/config/default.json) works seamlessly
RUN mkdir -p /usr/src && ln -s /app/apps/server /usr/src/app

RUN chown -R 1001:0 /app /usr/src && chmod -R g=u /app /usr/src

USER 1001
EXPOSE 8080

WORKDIR /app/apps/server/dist

CMD ["dumb-init", "node", "--import", "./instrumentation.mjs", "./index.js"]
