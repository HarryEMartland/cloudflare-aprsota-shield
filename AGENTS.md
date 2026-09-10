## Project overview

A [Cloudflare Worker](https://developers.cloudflare.com/workers/) that serves a
[shields.io](https://shields.io)-style badge showing an
[APRS OTA](https://aprsota.org) user's **points** and **QSO count**. The worker
scrapes the operator's public page and proxies a generated badge.

## Tech stack

- **Runtime:** Cloudflare Workers (ES modules format, `export default { fetch }`)
- **Language:** Plain JavaScript (no TypeScript, no build step)
- **Tooling:** [wrangler](https://developers.cloudflare.com/workers/wrangler/) (v4)

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Run the worker locally (`wrangler dev`) |
| `npm test` | Run the test suite (`node --test`) |
| `npm run deploy` | Deploy to Cloudflare (`wrangler deploy`); runs `npm test` first via `predeploy` |

There is no lint or typecheck script configured. To syntax-check a change
without deploying, you can run `node --check src/index.js` (the file uses ES
modules but is still syntactically validatable).

## Key files

- `src/index.js` — the entire worker implementation
- `test/index.test.js` — the test suite; mocks the aprsota.org fetch via `node:test`'s `t.mock`
- `wrangler.toml` — Worker config (name, compatibility date, `[vars]`)
- `README.md` — end-user documentation
- `package.json` — scripts and dependencies

## How it works

1. Reads the callsign from the `callsign` (or `call`) query parameter and uppercases it.
2. Fetches `https://aprsota.org/<CALLSIGN>`.
3. Scrapes **points** from the `op-scoreboard-num` class and **QSOs** from the
   `operator-minis` class via regex in `extractStats()`.
4. Redirects a manual `302` response with cache headers.


## Conventions & gotchas

- The worker is an ES module (`export default { async fetch(request, env) }`); keep the
  module format intact.
- Caching: responses use `Cache-Control` driven by the `CACHE_TTL` env var (default
  `900` seconds). The redirect is a **manual** `Response(null, { status: 302, ... })` —
  do **not** switch back to `Response.redirect()`, which returns an immutable response
  and strips cache headers.
- The scraping regexes target exact CSS classes in aprsota.org's HTML
  (`op-scoreboard-num`, `operator-minis`). If aprsota.org changes its markup, these
  regexes break — keep them in sync.
- Badge styling lives in `BADGE_DEFAULTS` (label `APRS OTA`, color `orange`).
- Prefer keeping everything self-contained in `src/index.js`; the project has no other
  source files.
- `node_modules`, `.wrangler/`, and `dist/` are gitignored.
