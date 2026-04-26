# Up To Date

A tech news dashboard that fetches articles from default RSS feeds (TechCrunch, The Verge, Inquirer, Rappler) and Hacker News. You can add your own custom RSS feeds through the sources panel. Click the sparkle button on any article to get an AI summary using Groq's free API.

See [TEST_RESULTS.md](TEST_RESULTS.md) for test verification.

## What It Does

- Fetches articles from default sources plus any custom feeds you add
- Shows source icon, title, and publish time
- Click sparkle button to get an AI summary (uses Groq - free)
- Dark/light mode toggle
- Compact/expanded view toggle
- Keyboard shortcuts
- Search articles
- Add/remove/edit custom RSS feeds
- Install as PWA (works offline for loaded content)

## Quick Start

### Using Docker (Recommended)

```bash
cd tech-dashboard
docker compose up --build
```

Open http://localhost

### Running Locally

Backend:
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Get Groq API Key (Required for AI Summaries)

1. Go to https://console.groq.com/keys
2. Create free account
3. Click "Create API Key"
4. Copy key to backend/.env:
   ```
   GROQ_API_KEY=gsk_your_key_here
   ```

## Default News Sources

- TechCrunch
- The Verge
- Inquirer (Philippines)
- Rappler (Philippines)
- Hacker News

You can add more through the sources panel (press S).

## Keyboard Shortcuts

- r - Refresh news
- j/k - Navigate articles
- Enter - Open selected article
- d - Toggle dark/light mode
- c - Toggle compact mode
- / - Focus search
- s - Open sources panel
- ? - Show all shortcuts

## Tech Stack

- Frontend: React, TypeScript, Tailwind, Vite
- Backend: FastAPI, SQLAlchemy, SQLite
- AI: Groq (free 14,400 requests/minute)

## API Endpoints

- GET /api/news/global - Global tech news
- GET /api/news/ph - Philippine news
- POST /api/refresh - Refresh feeds
- GET /api/search?q= - Search articles
- GET /api/sources - Get all sources
- POST /api/sources - Add custom source
- DELETE /api/sources/{id} - Remove source

## Project Structure

```
tech-dashboard/
├── backend/
│   ├── main.py           # API endpoints
│   ├── services/
│   │   └── groq_service.py  # AI summaries
│   ├── scrapers/
│   │   └── news_scraper.py # Hacker News scraper
│   └── .env              # API keys
├── frontend/
│   ├── src/
│   │   ├── App.tsx       # Main app
│   │   └── components/   # UI components
│   └── public/
│       └── manifest.json  # PWA config
└── docker-compose.yml    # Run everything
```