# CartCraft → Kroger Cart

Plan meals for any date range (a day, a week, a month), pull ingredients straight from recipe URLs — including
TikTok, Instagram Reels, and YouTube — and push an aggregated shopping list directly into your real Kroger cart.
You do the final review and payment in the Kroger app; nothing here submits payment on your behalf (no public
grocery API allows that, for anyone).

## What it does

1. **Add recipes** — paste a URL (YouTube/TikTok/Instagram/any recipe webpage) or type ingredients in by hand.
   For video links, the app first checks the caption/description for a usable ingredient list (most recipe
   creators include one); if that's not there, it falls back to downloading and transcribing the audio
   (optional — requires an OpenAI API key). If neither works, you're prompted to paste the ingredients yourself.
2. **Build a meal plan** — pick a start/end date (any range) and assign recipes to specific days/meals, with a
   servings multiplier per entry.
3. **Generate a shopping list** — ingredients from every recipe in the plan are combined and unit-converted
   (e.g. "2 tbsp olive oil" + "1 cup olive oil" → one line item), scaled by each recipe's multiplier.
4. **Match to Kroger products** — once you've connected your Kroger account and picked a store, each shopping
   list item is matched to a real product in that store's catalog.
5. **Push to your Kroger cart** — confirmed, matched items are added directly to your actual Kroger cart via
   the Kroger Cart API. Open the Kroger app to review and check out.

## Why "push to cart, you tap confirm" instead of a fully automatic order

Checked both major platforms before building this:

- **Instacart's public developer API** only generates a shopping-list URL — the user must open it and check out
  manually on Instacart's site. The API that actually places/fulfills orders is restricted to enterprise retail
  partners under contract, not available to individual developers.
- **Kroger's public API** lets an authorized user's real cart be populated directly — the closest thing to
  "automatic" available without an enterprise partnership. Final payment still happens in Kroger's own app; no
  public grocery API lets a third-party app submit payment unattended.

## Tech stack

- Next.js 14 (App Router, TypeScript), run as a persistent Node server (not serverless — video/audio
  processing needs longer execution time than typical serverless function limits)
- PostgreSQL + Prisma ORM
- Auth.js (NextAuth v4, credentials/email+password, JWT sessions)
- `yt-dlp` (shelled out) for video metadata/caption extraction
- Anthropic API for LLM-based ingredient extraction from messy captions/transcripts
- OpenAI Whisper API (optional) for audio transcription fallback
- Kroger Partner API (OAuth2 + Products + Cart) for account connection and cart push

## Setup

### Prerequisites

- Node.js 18+
- A PostgreSQL database (local, or a managed one like [Neon](https://neon.tech) or Render's managed Postgres)
- [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) and `ffmpeg` on the server (`pip install yt-dlp`, plus
  `apt install ffmpeg` / `brew install ffmpeg`)
- An [Anthropic API key](https://console.anthropic.com) (for ingredient extraction from messy text)
- Optionally, an [OpenAI API key](https://platform.openai.com) (for audio transcription fallback)

### Kroger developer registration (do this first — it gates the cart feature)

1. Go to [developer.kroger.com](https://developer.kroger.com) and sign in (create a free Kroger account if you
   don't have one).
2. Go to your dashboard and click **Register an Application** (sometimes called "Add Application").
3. Fill in the application details:
   - **Application name**: anything descriptive, e.g. "CartCraft"
   - **Application type**: choose the option for a web app that needs user authorization (not
     "client credentials only") — you need this because the Cart API acts on behalf of a real shopper.
   - **Redirect URI**: must exactly match what you'll set as `KROGER_REDIRECT_URI` — for local dev that's
     `http://localhost:3000/api/kroger/callback`; for production, `https://your-domain.com/api/kroger/callback`.
   - **Scopes**: request `product.compact` (for product search) and `cart.basic:write` (to add items to a
     user's cart). Kroger may ask what your app does — describe it as a personal meal-planning tool that adds
     grocery items to the signed-in user's Kroger cart.
4. Submit. You'll get a **Client ID** and **Client Secret** — put these in `KROGER_CLIENT_ID` /
   `KROGER_CLIENT_SECRET`.
5. Note: Kroger's catalog only covers Kroger-owned banners (Kroger, Ralphs, Fry's, King Soopers, Smith's,
   QFC, and others) — the cart-push feature only works for stores in that family.
6. If Kroger's UI or process has changed since this was written, their docs at
   [developer.kroger.com/documentation](https://developer.kroger.com/documentation) are the source of truth —
   this app's `src/lib/kroger.ts` implements the standard OAuth2 authorization-code flow plus Products and
   Cart endpoints, which is unlikely to change shape even if the portal UI does.

### Local development

```bash
cp .env.example .env.local
# fill in DATABASE_URL, NEXTAUTH_SECRET (openssl rand -base64 32), KROGER_*, ANTHROPIC_API_KEY

npm install
npx prisma migrate dev --name init   # creates tables in your Postgres database
npm run dev                           # http://localhost:3000
```

Run the unit tests (ingredient parsing, unit conversion/aggregation, product matching) with:

```bash
npm test
```

### A note on this repo's own verification

This codebase was built and its unit tests (parsing, unit conversion, aggregation, product matching — 27 tests)
were run and pass in the environment that generated it. That environment's network is allowlisted and could not
reach `binaries.prisma.sh` to download Prisma's query-engine binary, so `npx prisma generate` and a full
`next build` could not be completed there. The resulting TypeScript errors (12, all in files that consume the
generated Prisma client) all trace back to that single missing step — they will resolve automatically the
moment `npx prisma generate` runs somewhere with normal internet access, which is the case for essentially any
real dev machine, CI runner, or hosting provider. Run `npx prisma generate` and `npm run build` locally as your
first step and treat any errors that remain after that as real ones to report/fix.

## Deployment (recommended: Render)

Serverless platforms like Vercel impose short function execution limits that can cut off video downloads/audio
transcription. [Render](https://render.com) (or Railway, Fly.io, or a plain VPS) runs Next.js as a persistent
Node process instead, which avoids that entirely.

1. Push this repo to GitHub.
2. On Render: **New → Web Service**, connect the repo.
   - Build command: `npm install && npx prisma generate && npm run build`
   - Start command: `npx prisma migrate deploy && npm start`
   - Add a **PostgreSQL** instance (Render → New → PostgreSQL) and copy its connection string into
     `DATABASE_URL`.
   - Install `yt-dlp`/`ffmpeg` on the instance — either via a custom Dockerfile (recommended for reliability) or
     a build-command step (`pip install yt-dlp && apt-get install -y ffmpeg`, availability depends on Render's
     build image).
3. Set all the environment variables from `.env.example` in Render's dashboard, using your production
   `KROGER_REDIRECT_URI` (must match what's registered in the Kroger dashboard) and a fresh `NEXTAUTH_SECRET`.
4. Deploy, then visit `/signup` to create your first account.

## Known limitations

- TikTok and Instagram sometimes block server-side scraping or require login cookies; `yt-dlp` extraction can
  fail intermittently for these — the app falls back to asking you to paste the recipe manually when that
  happens.
- Ingredient-to-Kroger-product matching is a heuristic (token overlap over Kroger's search results) — always
  glance over matches before confirming, especially anything flagged "check this."
- The Kroger catalog only covers Kroger-owned banners; this won't help if you shop somewhere else.
- No grocery API (Kroger, Instacart, or otherwise) allows unattended payment — this is a permanent constraint
  of the product, not a v1 gap.

## Project structure

```
src/
  lib/                  Core logic: parsing, unit conversion/aggregation, LLM extraction,
                         video ingestion, Kroger API client, product matching, auth
  lib/__tests__/        Unit tests for the above
  app/                  Next.js App Router pages + API routes
prisma/schema.prisma    Database schema
```
