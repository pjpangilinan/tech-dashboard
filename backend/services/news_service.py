from sqlalchemy.orm import Session
from sqlalchemy import desc
from db.database import ArticleDB, UserPreferencesDB, SessionLocal
from models.schemas import ArticleBase, Category, UserPreferences
from scrapers.news_scraper import HackerNewsScraper
from services.ai_service import AIService, recommend_articles
from services.sources_service import sources_service
from datetime import datetime, timedelta
from typing import List, Optional
import hashlib
import concurrent.futures
import threading


class NewsService:
    def __init__(self):
        self.hn_scraper = HackerNewsScraper()
        self.ai = AIService()
        self._rss_cache = {}
        self._rss_cache_ttl = 300
        self._lock = threading.Lock()
    
    def fetch_and_process_all(self, db: Session, force_refresh: bool = False) -> dict:
        if not force_refresh:
            cutoff = datetime.utcnow() - timedelta(minutes=5)
            recent = db.query(ArticleDB).filter(ArticleDB.created_at > cutoff).first()
            if recent:
                return {"status": "cached", "message": "Using cached data (less than 5 min old)"}
        
        db.query(ArticleDB).delete()
        db.commit()
        
        all_articles = []
        
        hn_articles = self.hn_scraper.fetch_top_stories()
        for article in hn_articles:
            article_dict = self._process_article(article, skip_ai=True)
            all_articles.append(article_dict)
        
        rss_sources = sources_service.get_enabled_sources(db)
        
        def fetch_single_source(args):
            name, url = args
            return self._fetch_rss_fast(name, url)
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            futures = [executor.submit(fetch_single_source, (name, url)) for name, url in rss_sources.items()]
            for future in concurrent.futures.as_completed(futures):
                try:
                    articles = future.result()
                    for article in articles:
                        article_dict = self._process_article(article, skip_ai=True)
                        all_articles.append(article_dict)
                except Exception as e:
                    print(f"Source fetch error: {e}")
        
        seen_ids = set()
        unique_articles = []
        for article_dict in all_articles:
            ext_id = article_dict.get("external_id")
            if ext_id not in seen_ids:
                seen_ids.add(ext_id)
                unique_articles.append(article_dict)
        
        for i, article_dict in enumerate(unique_articles):
            db_article = ArticleDB(**article_dict)
            db.add(db_article)
        
        db.commit()
        
        return {"global": [], "ph": [], "total": len(unique_articles)}
    
    def _fetch_rss_fast(self, source_name: str, feed_url: str) -> List[ArticleBase]:
        import feedparser
        import html
        
        articles = []
        try:
            feed = feedparser.parse(feed_url)
            for entry in feed.entries[:15]:
                try:
                    published = None
                    if entry.get("published_parsed"):
                        published = datetime(*entry.published_parsed[:6])
                    
                    articles.append(ArticleBase(
                        title=html.unescape(entry.title),
                        url=entry.link,
                        source=source_name,
                        published_at=published,
                        tags=[]
                    ))
                except Exception:
                    continue
        except Exception as e:
            print(f"RSS fetch error for {source_name}: {e}")
        
        return articles
    
    def _fetch_rss(self, source_name: str, feed_url: str, bypass_cache: bool = False) -> List[ArticleBase]:
        import feedparser
        import time
        import html
        
        now = time.time()
        cache_key = f"{source_name}:{feed_url}"
        
        if not bypass_cache and cache_key in self._rss_cache:
            cached_time, cached_articles = self._rss_cache[cache_key]
            if now - cached_time < self._rss_cache_ttl:
                return cached_articles
        
        articles = self._fetch_rss_fast(source_name, feed_url)
        
        with self._lock:
            self._rss_cache[cache_key] = (now, articles)
        
        return articles
    
    def _process_article(self, article: ArticleBase, skip_ai: bool = False) -> dict:
        article_dict = article.model_dump()
        
        article_dict["category"] = "General Tech"
        article_dict["tags"] = []
        article_dict["summary"] = None
        
        article_dict["external_id"] = hashlib.md5(article.url.encode()).hexdigest()
        
        article_dict.pop("why_it_matters", None)
        
        return article_dict
    
    def get_articles(self, db: Session, category: Optional[str] = None, 
                     source: Optional[str] = None, limit: int = 50) -> List[dict]:
        query = db.query(ArticleDB)
        
        if category:
            query = query.filter(ArticleDB.category == category)
        if source:
            query = query.filter(ArticleDB.source == source)
        
        articles = query.order_by(desc(ArticleDB.created_at)).limit(limit).all()
        
        return [self._to_dict(a) for a in articles]
    
    def get_global_news(self, db: Session, limit: int = 30, sort_by: str = "date_desc") -> List[dict]:
        ph_sources = ["Inquirer", "Rappler"]
        query = db.query(ArticleDB).filter(~ArticleDB.source.in_(ph_sources))
        
        if sort_by == "date_desc":
            articles = query.order_by(desc(ArticleDB.created_at)).limit(limit).all()
        elif sort_by == "date_asc":
            articles = query.order_by(ArticleDB.created_at).limit(limit).all()
        elif sort_by == "source":
            articles = query.order_by(ArticleDB.source).limit(limit).all()
        elif sort_by == "category":
            articles = query.order_by(ArticleDB.category).limit(limit).all()
        else:
            articles = query.order_by(desc(ArticleDB.created_at)).limit(limit).all()
        
        return [self._to_dict(a) for a in articles]
    
    def get_ph_news(self, db: Session, limit: int = 20, sort_by: str = "date_desc") -> List[dict]:
        ph_sources = ["Inquirer", "Rappler"]
        query = db.query(ArticleDB).filter(ArticleDB.source.in_(ph_sources))
        
        if sort_by == "date_desc":
            articles = query.order_by(desc(ArticleDB.created_at)).limit(limit).all()
        elif sort_by == "date_asc":
            articles = query.order_by(ArticleDB.created_at).limit(limit).all()
        elif sort_by == "source":
            articles = query.order_by(ArticleDB.source).limit(limit).all()
        elif sort_by == "category":
            articles = query.order_by(ArticleDB.category).limit(limit).all()
        else:
            articles = query.order_by(desc(ArticleDB.created_at)).limit(limit).all()
        
        return [self._to_dict(a) for a in articles]
    
    def get_recommendations(self, db: Session, topics: List[str], limit: int = 10) -> List[dict]:
        articles = db.query(ArticleDB).order_by(desc(ArticleDB.created_at)).limit(100).all()
        article_dicts = [self._to_dict(a) for a in articles]
        
        return recommend_articles(article_dicts, topics, limit)
    
    def get_article_by_id(self, db: Session, article_id: int) -> Optional[dict]:
        article = db.query(ArticleDB).filter(ArticleDB.id == article_id).first()
        if article:
            return self._to_dict(article)
        return None
    
    def tag_article(self, db: Session, article_id: int) -> Optional[dict]:
        from services.groq_service import groq_service
        
        article = db.query(ArticleDB).filter(ArticleDB.id == article_id).first()
        if not article:
            return None
        
        if article.tags and len(article.tags) > 0:
            return {"tags": article.tags}
        
        result = groq_service.tag_article(article.title, article.summary)
        
        if result and result.get("tags"):
            article.tags = result["tags"]
            db.commit()
            return {"tags": article.tags}
        
        return None
    
    def _to_dict(self, article: ArticleDB) -> dict:
        tags = article.tags
        if tags is None or tags == "" or tags == "[]":
            tags = []
        elif isinstance(tags, str):
            import json
            try:
                tags = json.loads(tags)
            except:
                tags = []
        
        return {
            "id": article.id,
            "title": article.title,
            "url": article.url,
            "source": article.source,
            "published_at": article.published_at.isoformat() if article.published_at else None,
            "summary": article.summary,
            "category": article.category,
            "tags": tags
        }


class PreferencesService:
    def __init__(self):
        pass
    
    def get_preferences(self, db: Session, user_id: str = "default") -> dict:
        prefs = db.query(UserPreferencesDB).filter(UserPreferencesDB.user_id == user_id).first()
        
        if not prefs:
            return {"user_id": user_id, "topics": [], "sources": []}
        
        return {
            "user_id": prefs.user_id,
            "topics": prefs.topics or [],
            "sources": prefs.sources or []
        }
    
    def save_preferences(self, db: Session, preferences: UserPreferences, user_id: str = "default") -> dict:
        prefs = db.query(UserPreferencesDB).filter(UserPreferencesDB.user_id == user_id).first()
        
        if prefs:
            prefs.topics = [t.value if hasattr(t, 'value') else t for t in preferences.topics]
            prefs.sources = preferences.sources
        else:
            prefs = UserPreferencesDB(
                user_id=user_id,
                topics=[t.value if hasattr(t, 'value') else t for t in preferences.topics],
                sources=preferences.sources
            )
            db.add(prefs)
        
        db.commit()
        
        return self.get_preferences(db, user_id)