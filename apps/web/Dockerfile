# syntax=docker/dockerfile:1.7
FROM node:24.16.0-bookworm-slim AS build

WORKDIR /app
RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile
ARG NEXT_PUBLIC_SENTRY_CLIENT_ENABLED=false
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_RELEASE
ARG NEXT_PUBLIC_SENTRY_ENVIRONMENT
ARG SENTRY_ORG
ARG SENTRY_PROJECT
RUN --mount=type=secret,id=sentry_auth_token,env=SENTRY_AUTH_TOKEN \
  pnpm -r --filter @lasoviet/web... run build
# Source maps are private build artifacts, including when the uploader leaves auxiliary maps.
RUN node scripts/remove-web-source-maps.mjs apps/web/.next/static apps/web/.next/standalone

FROM node:24.16.0-bookworm-slim AS runtime

WORKDIR /app
RUN groupadd --system --gid 1001 lasoviet \
  && useradd --system --uid 1001 --gid lasoviet lasoviet

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=build --chown=lasoviet:lasoviet /app/apps/web/.next/standalone ./
COPY --from=build --chown=lasoviet:lasoviet /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=lasoviet:lasoviet /app/apps/web/public ./apps/web/public
COPY --from=build --chown=lasoviet:lasoviet /app/config ./config

USER lasoviet
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
