from sqlalchemy.orm import Session
from db.database import NewsSourceDB, SessionLocal
from models.schemas import NewsSource
from services.feed_validator import feed_validator
from datetime import datetime


DEFAULT_SOURCES = [
    {"name": "TechCrunch", "feed_url": "https://techcrunch.com/feed/", "site_url": "https://techcrunch.com"},
    {"name": "The Verge", "feed_url": "https://www.theverge.com/rss/index.xml", "site_url": "https://theverge.com"},
    {"name": "Inquirer", "feed_url": "https://newsinfo.inquirer.net/feed", "site_url": "https://inquirer.net"},
    {"name": "Rappler", "feed_url": "https://www.rappler.com/feed/", "site_url": "https://rappler.com"},
]


class SourcesService:
    def __init__(self):
        self._initialized = False
    
    def initialize_default_sources(self, db: Session):
        if self._initialized:
            return
        
        existing = db.query(NewsSourceDB).first()
        if not existing:
            for src in DEFAULT_SOURCES:
                db_source = NewsSourceDB(**src, is_custom=0, enabled=1)
                db.add(db_source)
            db.commit()
        
        self._initialized = True
    
    def get_all_sources(self, db: Session) -> list[dict]:
        self.initialize_default_sources(db)
        sources = db.query(NewsSourceDB).all()
        return [self._to_dict(s) for s in sources]
    
    def get_enabled_sources(self, db: Session) -> dict:
        self.initialize_default_sources(db)
        sources = db.query(NewsSourceDB).filter(NewsSourceDB.enabled == 1).all()
        return {s.name: s.feed_url for s in sources}
    
    def add_source(self, db: Session, source: NewsSource) -> dict:
        self.initialize_default_sources(db)
        
        existing = db.query(NewsSourceDB).filter(NewsSourceDB.feed_url == source.feed_url).first()
        if existing:
            raise ValueError("Feed URL already exists")
        
        db_source = NewsSourceDB(
            name=source.name,
            feed_url=source.feed_url,
            site_url=source.site_url,
            enabled=1,
            is_custom=1
        )
        db.add(db_source)
        db.commit()
        db.refresh(db_source)
        
        return self._to_dict(db_source)
    
    def validate_feed(self, feed_url: str) -> dict:
        result = feed_validator.validate_feed(feed_url)
        return {
            "valid": result.valid,
            "feed_url": result.feed_url,
            "title": result.title,
            "article_count": result.article_count,
            "error": result.error
        }
    
    def toggle_source(self, db: Session, source_id: int, enabled: bool) -> dict:
        source = db.query(NewsSourceDB).filter(NewsSourceDB.id == source_id).first()
        if not source:
            raise ValueError("Source not found")
        
        source.enabled = 1 if enabled else 0
        db.commit()
        
        return self._to_dict(source)
    
    def delete_source(self, db: Session, source_id: int) -> bool:
        source = db.query(NewsSourceDB).filter(NewsSourceDB.id == source_id).first()
        if not source:
            raise ValueError("Source not found")
        
        if not source.is_custom:
            raise ValueError("Cannot delete default sources")
        
        db.delete(source)
        db.commit()
        
        return True
    
    def _to_dict(self, source: NewsSourceDB) -> dict:
        return {
            "id": source.id,
            "name": source.name,
            "feed_url": source.feed_url,
            "site_url": source.site_url,
            "enabled": bool(source.enabled),
            "is_custom": bool(source.is_custom),
            "last_fetched": source.last_fetched.isoformat() if source.last_fetched else None
        }


sources_service = SourcesService()