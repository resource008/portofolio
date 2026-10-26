# syntax=docker/dockerfile:1
# Build context: repo root  →  docker build -f apps/api/Dockerfile -t portofolio-api .

FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo

FROM base AS build
# Manifests first so the dependency layer is cached until the lockfile changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @portofolio/api...
COPY apps/api apps/api
COPY packages/shared packages/shared
RUN pnpm --filter @portofolio/api build \
 && pnpm deploy --filter @portofolio/api --prod /out

FROM node:24-alpine AS runtime
ENV NODE_ENV=production \
    NODE_OPTIONS=--max-old-space-size=192 \
    PORT=3001
WORKDIR /app
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/package.json ./package.json
COPY --from=build --chown=node:node /repo/apps/api/dist ./dist
COPY --from=build --chown=node:node /repo/apps/api/migrations ./migrations
USER node
EXPOSE 3001
CMD ["node", "dist/index.js"]
