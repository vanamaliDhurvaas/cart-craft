# CartCraft — production image for Render (or any Docker host).
#
# Debian-based (not Alpine) on purpose: Prisma's query engine binary has a
# history of glibc/musl mismatches on Alpine, and this keeps that off the
# table entirely.
FROM node:22-bookworm-slim

# System dependencies the ingestion pipeline shells out to:
#   - ffmpeg: converts downloaded audio before it's sent to Whisper
#   - curl/ca-certificates: used once below to fetch the yt-dlp binary
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# yt-dlp ships as a single self-contained binary — no Python install needed.
# YouTube/TikTok/Instagram change their anti-scraper measures often enough
# that "latest" here (re-pulled on every image build) matters more than
# pinning a version.
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# `prisma generate` only reads prisma/schema.prisma to produce the client —
# it doesn't need a live DATABASE_URL connection at build time.
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

# Render assigns the real port via $PORT at runtime; next start doesn't pick
# that up on its own unless it's passed explicitly with -p.
CMD ["sh", "-c", "npx next start -p ${PORT:-3000}"]
