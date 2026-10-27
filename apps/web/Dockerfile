# syntax=docker/dockerfile:1
# Build context: repo root  →  docker build -f apps/web/Dockerfile -t portofolio-web .

FROM node:24-alpine AS build
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @portofolio/web...
COPY apps/web apps/web
COPY packages/shared packages/shared
RUN pnpm --filter @portofolio/web build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
# Non-root cannot bind ports below 1024, so nginx listens on 8080.
USER 101
EXPOSE 8080
