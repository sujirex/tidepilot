# 🌊 TidePilot

**Real-time tidal data and coastal planning for marine and shipyard operations.**

Live app: **[tidepilot.sujikumar.com](https://tidepilot.sujikumar.com)**
---

## The problem

Tide windows drive a lot of shipyard and marine decisions — launches, dockings, dredging, and coastal movements all hinge on getting the water level right at the right time. That data is usually buried in separate tide-table sites and port pages. TidePilot pulls it into one planning view.

## What it does

- **Tide predictions** — real-time and forecast tidal data for selected stations.
- **Port schedules** — port timing information alongside the tide window.
- **Coastal planning tools** — plan operations around high/low water and tidal range.

## Tech stack

- **Next.js** + **TypeScript**
- Tidal data API integration
- JavaScript, client-side planning UI

## Running locally

```bash
git clone https://github.com/sujirex/TidePilot.git
cd TidePilot
npm install
npm run dev
```

Open http://localhost:3000.

> Note: if the app uses an external tidal API key, document the required environment variable here (e.g. `TIDE_API_KEY` in `.env.local`).

## About

Built by **Suji Kumar C** — Digital Maritime Engineer, 13+ years across every layer of a working shipyard.
Portfolio: [sujikumar.com](https://sujikumar.com) · LinkedIn: [in/sujirex](https://www.linkedin.com/in/sujirex)
