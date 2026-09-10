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

The response is a redirect to a badge svg.

```html
<img src="https://<your-worker>.workers.dev/?callsign=M7HDD" alt="APRS OTA">
```

## Configuration

## Caching

The badge SVG is returned with `Cache-Control: public, max-age=3600, s-maxage=300`
(1 hour). aprsota.org pages update in real time, so re-fetch them on a 1-hour
cadence. If you want fresher numbers, lower these values.
