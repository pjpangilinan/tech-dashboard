from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class Category(str, Enum):
    AI = "AI/LLMs"
    CYBERSECURITY = "Cybersecurity"
    BIG_TECH = "Big Tech"
    WEB_DEV = "Web Development"
    GAMING = "Gaming Tech"
    PHILIPPINE = "Philippine Tech"
    GENERAL = "General Tech"


class ArticleBase(BaseModel):
    title: str
    url: str
    source: str
    published_at: Optional[datetime] = None
    summary: Optional[str] = None
    category: Optional[Category] = None
    tags: List[str] = []
    why_it_matters: Optional[str] = None


class Article(ArticleBase):
    id: int
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True


class TrendingRepo(BaseModel):
    name: str
    url: str
    description: Optional[str] = None
    stars: int
    forks: int
    language: Optional[str] = None
    today_stars: int


class JobListing(BaseModel):
    id: Optional[int] = None
    title: str
    company: str
    url: str
    location: Optional[str] = None
    salary: Optional[str] = None
    tags: List[str] = []
    posted_at: Optional[str] = None


class UserPreferences(BaseModel):
    topics: List[Category] = []
    sources: List[str] = []
    notifications_enabled: bool = False


class NewsSource(BaseModel):
    id: Optional[int] = None
    name: str
    feed_url: str
    site_url: Optional[str] = None
    enabled: bool = True
    is_custom: bool = False


class FeedValidationResult(BaseModel):
    valid: bool
    feed_url: str
    title: Optional[str] = None
    article_count: int = 0
    error: Optional[str] = None