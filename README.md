# Curio — AR Visual Discovery

Curio is an AR + AI-powered visual discovery app that encourages physical world exploration. Point your camera at any object — a plant, a rock, a gadget, a landmark — and Curio identifies it, explains what it is, and helps you build a collection of your discoveries.

## Features

- **AR Camera Discovery** — Full-screen live camera with targeting reticle and AI vision analysis
- **AI Identification** — Structured results with name, category, confidence score, description, materials, interesting facts, and maintenance tips
- **Ask AI** — Follow-up conversations about any discovery with full context retention
- **Collections** — Organize discoveries into custom collections
- **Gamification** — XP, 7 levels, achievements, daily challenges, and exploration streaks
- **Rarity System** — Discoveries classified as common, interesting, unusual, or exceptional
- **Search** — Find discoveries by title, category, brand, or tags

## Tech Stack

- React + Vite + Tailwind CSS
- Base44 BaaS (auth, database, hosting)
- OpenAI Vision API (server-side, via backend functions)
- Framer Motion (animations)
- Row-Level Security on all user data

## Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env.local` file with your Base44 credentials:
   ```
   VITE_BASE44_APP_ID=your_app_id
   VITE_BASE44_APP_BASE_URL=your_backend_url
   ```
4. Run the app: `npm run dev`

## Publish

Open [Base44.com](https://base44.com) and click Publish.