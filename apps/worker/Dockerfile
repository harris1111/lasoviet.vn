FROM node:24.16.0-bookworm-slim AS build

WORKDIR /app
RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm -r --filter @lasoviet/worker... run build
RUN pnpm deploy --legacy --filter=@lasoviet/worker --prod /out

FROM node:24.16.0-bookworm-slim AS runtime

WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 lasoviet \
  && useradd --system --uid 1001 --gid lasoviet --create-home --home-dir /home/lasoviet lasoviet

ENV NODE_ENV=production
ENV HOME=/home/lasoviet
ENV CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

COPY --from=build --chown=lasoviet:lasoviet /out/ ./
COPY --from=build --chown=lasoviet:lasoviet /app/config ./config
COPY --from=build --chown=lasoviet:lasoviet /app/content ./content

USER lasoviet

CMD ["node", "dist/main.js"]
