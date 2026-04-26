from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from enum import Enum
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
from datetime import datetime
import json
import asyncio
import os

from db.database import get_db, init_db
from models.schemas import Article, UserPreferences, TrendingRepo, JobListing, NewsSource
from services.news_service import NewsService, PreferencesService
from services.sources_service import sources_service
from services.groq_service import groq_service


app = FastAPI(
    title="Tech Intelligence Dashboard API",
    description="AI-Powered Tech News Aggregation and Personalization",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

news_service = NewsService()
preferences_service = PreferencesService()


@app.get("/")
async def root():
    return {
        "message": "Tech Intelligence Dashboard API",
        "version": "1.0.0",
        "endpoints": [
            "/api/news/global",
            "/api/news/ph",
            "/api/recommendations",
            "/api/preferences",
            "/api/refresh"
        ]
    }


@app.post("/api/refresh")
async def refresh_news(db: Session = Depends(get_db)):
    try:
        result = news_service.fetch_and_process_all(db, force_refresh=True)
        return result
    except Exception as e:
        print(f"Error refreshing news: {e}")
        raise HTTPException(status_code=500, detail="Failed to refresh news. Please try again.")


class SortBy(str, Enum):
    DATE_DESC = "date_desc"
    DATE_ASC = "date_asc"
    SOURCE = "source"
    CATEGORY = "category"


@app.get("/api/news/global", response_model=List[dict])
async def get_global_news(
    limit: int = Query(30, ge=1, le=100),
    category: Optional[str] = None,
    sort_by: SortBy = Query(SortBy.DATE_DESC),
    db: Session = Depends(get_db)
):
    try:
        articles = news_service.get_global_news(db, limit, sort_by.value)
        
        if category:
            articles = [a for a in articles if a.get("category") == category]
        
        if not articles:
            news_service.fetch_and_process_all(db, force_refresh=True)
            articles = news_service.get_global_news(db, limit, sort_by.value)
        
        return articles
    except Exception as e:
        print(f"Error fetching global news: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch news. Please try again.")


@app.get("/api/news/ph", response_model=List[dict])
async def get_ph_news(
    limit: int = Query(20, ge=1, le=100),
    sort_by: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    try:
        articles = news_service.get_ph_news(db, limit, sort_by or "date_desc")
        
        if not articles:
            news_service.fetch_and_process_all(db, force_refresh=True)
            articles = news_service.get_ph_news(db, limit, sort_by or "date_desc")
        
        return articles
    except Exception as e:
        print(f"Error fetching PH news: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch PH news. Please try again.")


@app.get("/api/news/categories")
async def get_categories():
    return {
        "categories": [
            "AI/LLMs",
            "Cybersecurity",
            "Big Tech",
            "Web Development",
            "Gaming Tech",
            "Philippine Tech",
            "General Tech"
        ]
    }


@app.get("/api/recommendations")
async def get_recommendations(
    topics: List[str] = Query(default=[]),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    if not topics:
        user_prefs = preferences_service.get_preferences(db)
        topics = user_prefs.get("topics", [])
    
    articles = news_service.get_recommendations(db, topics, limit)
    
    if not articles:
        news_service.fetch_and_process_all(db, force_refresh=True)
        articles = news_service.get_recommendations(db, topics, limit)
    
    return {"articles": articles, "topics": topics}


@app.get("/api/preferences")
async def get_preferences(
    user_id: str = Query("default"),
    db: Session = Depends(get_db)
):
    return preferences_service.get_preferences(db, user_id)


@app.post("/api/preferences")
async def save_preferences(
    preferences: UserPreferences,
    user_id: str = Query("default"),
    db: Session = Depends(get_db)
):
    return preferences_service.save_preferences(db, preferences, user_id)


@app.get("/api/news/search")
async def search_news(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db)
):
    query_lower = q.lower()
    articles = news_service.get_articles(db, limit=100)
    
    results = [
        a for a in articles 
        if query_lower in a.get("title", "").lower() or 
           query_lower in a.get("category", "").lower() or
           any(query_lower in str(t).lower() for t in a.get("tags", []))
    ]
    
    return {"results": results[:limit], "query": q, "count": len(results)}


@app.get("/api/trending")
async def get_trending(db: Session = Depends(get_db)):
    articles = news_service.get_articles(db, limit=100)
    
    word_counts = {}
    stop_words = {"this", "that", "from", "with", "have", "been", "will", "would", "could", "should", "their", "there", "where", "when", "what", "about", "after", "before", "more", "most", "some", "only", "than", "your", "just", "because", "while", "which", "these", "those", "being", "other", "into", "very", "still", "such", "also", "many", "much", "want", "need", "however", "therefore", "whereas", "although", "despite", "except", "until", "unless"}
    
    for article in articles:
        for tag in article.get("tags", []):
            word_counts[tag] = word_counts.get(tag, 0) + 2
        title_words = article.get("title", "").lower().split()
        for word in title_words:
            if len(word) > 4 and word not in stop_words:
                word_counts[word] = word_counts.get(word, 0) + 1
    
    sorted_words = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)
    trending = [{"word": word, "count": int(count)} for word, count in sorted_words[:15]]
    
    return {"trending": trending, "total": len(articles)}


_stream_last_check = {}


@app.get("/api/stream")
async def stream_news(db: Session = Depends(get_db)):
    async def event_generator():
        stream_id = id(event_generator)
        _stream_last_check[stream_id] = datetime.utcnow().isoformat()
        
        while True:
            await asyncio.sleep(60)
            
            try:
                articles = news_service.get_global_news(db, limit=10, sort_by="date_desc")
                ph_articles = news_service.get_ph_news(db, limit=10, sort_by="date_desc")
                
                all_articles = articles + ph_articles
                
                new_count = 0
                if stream_id in _stream_last_check:
                    last_check = _stream_last_check[stream_id]
                    for a in all_articles:
                        if a.get("created_at") and a["created_at"] > last_check:
                            new_count += 1
                
                yield f"data: {json.dumps({'articles': all_articles[:5], 'count': new_count})}\n\n"
                _stream_last_check[stream_id] = datetime.utcnow().isoformat()
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    import asyncio
    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/api/debug/articles")
async def debug_articles(
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db)
):
    articles = news_service.get_articles(db, limit=limit)
    return {"articles": articles}


@app.get("/api/sources")
async def get_sources(db: Session = Depends(get_db)):
    return {"sources": sources_service.get_all_sources(db)}


@app.post("/api/sources")
async def add_source(
    source: NewsSource,
    db: Session = Depends(get_db)
):
    try:
        new_source = sources_service.add_source(db, source)
        return {"success": True, "source": new_source}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/sources/validate")
async def validate_feed(
    feed_url: str = Query(..., min_length=1)
):
    result = sources_service.validate_feed(feed_url)
    return result


@app.patch("/api/sources/{source_id}")
async def toggle_source(
    source_id: int,
    enabled: bool = Query(...),
    db: Session = Depends(get_db)
):
    try:
        updated = sources_service.toggle_source(db, source_id, enabled)
        return {"success": True, "source": updated}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.delete("/api/sources/{source_id}")
async def delete_source(
    source_id: int,
    db: Session = Depends(get_db)
):
    try:
        sources_service.delete_source(db, source_id)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/summarize")
async def summarize_article(
    title: str = Query(..., min_length=10),
    category: str = Query("General Tech"),
    db: Session = Depends(get_db)
):
    if not groq_service.is_configured:
        return {
            "summary": None,
            "error": "AI not configured. Add GROQ_API_KEY to backend/.env file."
        }
    
    summary = groq_service.summarize(title, category)
    
    if not summary:
        return {
            "summary": None,
            "error": "Summary generation failed. Check console for details."
        }
    
return {"summary": summary}

# Serve frontend static files in production
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Serve frontend static files in production
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="static")