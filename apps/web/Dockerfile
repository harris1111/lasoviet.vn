FROM node:24.16.0-bookworm-slim AS build

WORKDIR /app
RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm -r --filter @lasoviet/web... run build

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
