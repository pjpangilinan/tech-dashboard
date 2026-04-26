import requests
import feedparser
from typing import Optional, List
from models.schemas import FeedValidationResult


class FeedValidator:
    TIMEOUT = 15
    MAX_ARTICLES = 5
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "TechDashboard/1.0 (RSS Feed Validator)"
        })
    
    def validate_feed(self, feed_url: str) -> FeedValidationResult:
        try:
            if not self._is_valid_url(feed_url):
                return FeedValidationResult(
                    valid=False,
                    feed_url=feed_url,
                    error="Invalid URL format"
                )
            
            response = self.session.get(feed_url, timeout=self.TIMEOUT)
            response.raise_for_status()
            
            content_type = response.headers.get("Content-Type", "").lower()
            if "xml" not in content_type and "rss" not in content_type and "atom" not in content_type:
                if not self._looks_like_feed(response.text):
                    return FeedValidationResult(
                        valid=False,
                        feed_url=feed_url,
                        error=f"URL does not appear to be a valid feed (Content-Type: {content_type})"
                    )
            
            feed = feedparser.parse(response.text)
            
            if feed.bozo and not feed.entries:
                return FeedValidationResult(
                    valid=False,
                    feed_url=feed_url,
                    error="Feed appears malformed or empty"
                )
            
            feed_title = feed.feed.get("title", "Untitled Feed") if feed.feed else "Untitled Feed"
            
            article_count = len(feed.entries[:self.MAX_ARTICLES])
            
            if article_count == 0:
                return FeedValidationResult(
                    valid=False,
                    feed_url=feed_url,
                    error="Feed contains no articles"
                )
            
            return FeedValidationResult(
                valid=True,
                feed_url=feed_url,
                title=feed_title,
                article_count=article_count
            )
            
        except requests.exceptions.Timeout:
            return FeedValidationResult(
                valid=False,
                feed_url=feed_url,
                error="Connection timed out"
            )
        except requests.exceptions.ConnectionError:
            return FeedValidationResult(
                valid=False,
                feed_url=feed_url,
                error="Could not connect to feed URL"
            )
        except requests.exceptions.HTTPError as e:
            return FeedValidationResult(
                valid=False,
                feed_url=feed_url,
                error=f"HTTP error: {e.response.status_code}"
            )
        except Exception as e:
            return FeedValidationResult(
                valid=False,
                feed_url=feed_url,
                error=f"Validation failed: {str(e)}"
            )
    
    def _is_valid_url(self, url: str) -> bool:
        import re
        url_pattern = re.compile(
            r'^https?://'
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'
            r'localhost|'
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'
            r'(?::\d+)?'
            r'(?:/?|[/?]\S+)$', re.IGNORECASE)
        return bool(url_pattern.match(url))
    
    def _looks_like_feed(self, text: str) -> bool:
        text_lower = text.lower()
        return any(tag in text_lower for tag in ['<rss', '<feed', '<channel', 'xmlns', 'atom:']) or text.strip().startswith('<?xml')


feed_validator = FeedValidator()