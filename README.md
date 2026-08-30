# Cloudflare APRS OTA Shield

A [Cloudflare Worker](https://developers.cloudflare.com/workers/) that serves a
[shields.io](https://shields.io) style badge showing an [APRS OTA](https://aprsota.org)
user's **points** and **QSO count**.

It scrapes the operator's public page (e.g. `https://aprsota.org/M7HDD`) for the
all-time scoreboard numbers and proxies the generated badge.

## Deploy

```bash
npm install
npm run deploy
```

Locally:

```bash
npm run dev
```

## Usage

The worker takes the callsign as a query parameter:

```
https://<your-worker>.workers.dev/?callsign=M7HDD
```

It responds with one of:

| Mode | How to trigger | Response |
|------|----------------|----------|
| **SVG** (default) | no extra params | `image/svg+xml` badge body |
| **Redirect** | default | `302` to the shields.io badge URL |
| **JSON** | add `&json` | JSON with callsign, points, qsos, badgeUrl |
| **No redirect** | add `redirect=0` | SVG body instead of a redirect |

### Redirect (recommended for Markdown/HTML)

Redirect mode is the easiest to use in badges that are cached by GitHub, since the
final URL points straight at shields.io so the client-side cache key stays stable:

```html
<img src="https://<your-worker>.workers.dev/?callsign=M7HDD" alt="APRS OTA">
```

### JSON

```bash
curl "https://<your-worker>.workers.dev/?callsign=M7HDD&json"
```

```json
{
  "callsign": "M7HDD",
  "points": 40,
  "qsos": 20,
  "badgeUrl": "https://img.shields.io/badge/APRS%20OTA-40%20pts%20%2F%2020%20QSOs?..."
}
```

## Configuration

### Approved callsigns (optional)

By default the worker serves any callsign. To restrict it to a fixed allow-list, set
the `APPROVED_CALLSIGNS` environment variable in `wrangler.toml` (or as a secret) to a
comma-separated list:

```toml
[vars]
APPROVED_CALLSIGNS = "M7HDD,G0ABC,VA7XYZ"
```

Requests for any callsign not in the list return `403`. Leave it empty to allow all.

## Caching

The badge SVG is returned with `Cache-Control: public, max-age=3600, s-maxage=300`
(1 hour). aprsota.org pages update in real time, so re-fetch them on a 1-hour
cadence. If you want fresher numbers, lower these values.
