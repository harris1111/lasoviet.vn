FROM node:24.16.0-bookworm-slim AS build

WORKDIR /app
RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm -r --filter @lasoviet/worker... run build
RUN pnpm deploy --legacy --filter=@lasoviet/worker --prod /out

FROM node:24.16.0-bookworm-slim AS runtime

WORKDIR /app
RUN groupadd --system --gid 1001 lasoviet \
  && useradd --system --uid 1001 --gid lasoviet lasoviet

ENV NODE_ENV=production

COPY --from=build --chown=lasoviet:lasoviet /out/ ./
COPY --from=build --chown=lasoviet:lasoviet /app/config ./config

USER lasoviet

CMD ["node", "dist/main.js"]
