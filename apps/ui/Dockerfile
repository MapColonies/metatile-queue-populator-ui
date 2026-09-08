FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.22.0 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/ui/package.json apps/ui/tsconfig.json apps/ui/vite.config.ts apps/ui/index.html ./apps/ui/
COPY apps/ui/src/ ./apps/ui/src/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @metatile-queue-populator-ui/ui build

FROM nginxinc/nginx-unprivileged:alpine AS production

RUN rm -f /etc/nginx/conf.d/*
COPY --from=builder /app/apps/ui/dist /usr/share/nginx/html
COPY apps/ui/nginx.conf /etc/nginx/templates/default.conf.template

ENV BACKEND_SERVICE_HOST="metatile-queue-populator-ui-backend"
ENV BACKEND_SERVICE_PORT="8080"

EXPOSE 8080

USER 101

CMD ["nginx", "-g", "daemon off;"]
