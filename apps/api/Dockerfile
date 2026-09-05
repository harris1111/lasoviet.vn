FROM node:24.16.0-bookworm-slim AS build

WORKDIR /app
RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm -r --filter @lasoviet/api... run build
RUN pnpm deploy --legacy --filter=@lasoviet/api --prod /out

FROM node:24.16.0-bookworm-slim AS runtime

WORKDIR /app
RUN groupadd --system --gid 1001 lasoviet \
  && useradd --system --uid 1001 --gid lasoviet lasoviet

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=build --chown=lasoviet:lasoviet /out/ ./
COPY --from=build --chown=lasoviet:lasoviet /app/config ./config

USER lasoviet
EXPOSE 3001

CMD ["node", "dist/main.js"]
