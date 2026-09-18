# Monopoly AI Banker image-scan proxy

A small Cloudflare Worker that fronts the Gemini API for the Monopoly AI
Banker app. It holds the real `GEMINI_API_KEY` as a Worker secret (never
shipped in the app's client bundle -- the app is a webpage loaded in a
WebView, so a client-held key would be fully readable by anyone who opens
it) and rate-limits requests per IP as a burst-abuse guard.

Runs entirely on Cloudflare's free tier at this app's scale (100,000
requests/day). The real cost ceiling is that `GEMINI_API_KEY` should live on
a Google Cloud project with **no billing account linked** -- once the free
tier is exhausted, calls fail instead of charging anything. The rate limiter
only blunts rapid-fire abuse (20 requests/60s per IP); it isn't a daily cap
(Cloudflare's native rate limiter only supports 10s/60s windows), which is
fine since the no-billing key is what actually keeps this at $0.

## Endpoint

`POST /analyze` with JSON body `{ "image": "<base64 jpeg>" }`. Returns the
same `{ detectedMoney, detectedProperties, totalValue }` JSON shape the app
expects, rate-limited to 20 requests/60s per IP (`429` once exceeded).

## Deploying your own copy

1. `cd worker && npm install`
2. `npx wrangler login` (opens a browser -- log into or sign up for a free
   Cloudflare account, then approve the Wrangler CLI's permissions)
3. `npx wrangler secret put GEMINI_API_KEY` -- use a key from a Google Cloud
   project with no billing account attached, so the free tier is a hard
   spending ceiling
4. `npx wrangler deploy`

Wrangler will print the deployed URL (`https://<worker-name>.<your-subdomain>.workers.dev`).
Put that in the app's `.env` as `PROXY_URL` (or leave the app pointed at the
shared default in `vite.config.ts`).

## Local development

`npx wrangler dev` runs the worker locally. Put the real key in a
`.dev.vars` file (gitignored) in this directory:

```
GEMINI_API_KEY=your_key_here
```
