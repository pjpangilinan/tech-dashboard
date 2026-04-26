import requests
import feedparser
import time
from bs4 import BeautifulSoup
from typing import List, Optional
from datetime import datetime
from models.schemas import ArticleBase, Category
import html
import concurrent.futures


def decode_html(text: str) -> str:
    if not text:
        return text
    return html.unescape(text)


class HackerNewsScraper:
    BASE_URL = "https://hacker-news.firebaseio.com/v0"
    
    def __init__(self, limit: int = 20):
        self.limit = limit
        self._last_fetch = 0
        self._min_interval = 10
    
    def fetch_top_stories(self) -> List[ArticleBase]:
        articles = []
        try:
            response = requests.get(f"{self.BASE_URL}/topstories.json", timeout=10)
            story_ids = response.json()[:self.limit]
            
            def fetch_single(story_id):
                return self._fetch_story_fast(story_id)
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                futures = [executor.submit(fetch_single, sid) for sid in story_ids[:10]]
                for future in concurrent.futures.as_completed(futures):
                    try:
                        article = future.result()
                        if article:
                            articles.append(article)
                    except:
                        pass
            
            self._last_fetch = time.time()
                
        except Exception as e:
            print(f"HackerNews scraper error: {e}")
        
        return articles
    
    def _fetch_story_fast(self, story_id: int) -> Optional[ArticleBase]:
        try:
            response = requests.get(f"{self.BASE_URL}/item/{story_id}.json", timeout=5)
            data = response.json()
            
            if not data or not data.get("url"):
                return None
            
            published = None
            if data.get("time"):
                from datetime import timezone
                published = datetime.fromtimestamp(data["time"], tz=timezone.utc)
            
            return ArticleBase(
                title=decode_html(data.get("title", "")),
                url=data.get("url", ""),
                source="Hacker News",
                published_at=published,
                tags=["hacker-news"]
            )
        except:
            return None
    
    def _fetch_story(self, story_id: int) -> Optional[ArticleBase]:
        try:
            response = requests.get(f"{self.BASE_URL}/item/{story_id}.json", timeout=10)
            data = response.json()
            
            if not data or not data.get("url"):
                return None
            
            published = None
            if data.get("time"):
                from datetime import timezone
                published = datetime.fromtimestamp(data["time"], tz=timezone.utc)
            
            return ArticleBase(
                title=decode_html(data.get("title", "")),
                url=data.get("url", ""),
                source="Hacker News",
                published_at=published,
                tags=["hacker-news"]
            )
        except:
            return None


class RSSScraper:
    def __init__(self):
        self.sources = {
            "TechCrunch": "https://techcrunch.com/feed/",
            "The Verge": "https://www.theverge.com/rss/index.xml",
            "Inquirer": "https://newsinfo.inquirer.net/feed",
            "Rappler": "https://www.rappler.com/feed/"
        }
        self._last_fetch = {}
        self._cache_ttl = 300
    
    def fetch_all(self) -> List[ArticleBase]:
        articles = []
        now = time.time()
        
        for name, url in self.sources.items():
            last = self._last_fetch.get(name, 0)
            if now - last < self._cache_ttl:
                continue
            
            fetched = self._fetch_feed(name, url)
            articles.extend(fetched)
            self._last_fetch[name] = now
            time.sleep(1)
        
        return articles
    
    def _fetch_feed(self, source_name: str, url: str) -> List[ArticleBase]:
        articles = []
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries[:15]:
                try:
                    published = None
                    if entry.get("published_parsed"):
                        from datetime import timezone
                        published = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
                    
                    tags = self._extract_tags(entry)
                    category = self._classify_by_keywords(entry.title + " " + entry.get("summary", ""))
                    
                    articles.append(ArticleBase(
                        title=decode_html(entry.title),
                        url=entry.link,
                        source=source_name,
                        published_at=published,
                        tags=tags,
                        category=category
                    ))
                except Exception as e:
                    continue
        except Exception as e:
            print(f"RSS feed error for {source_name}: {e}")
        
        return articles
    
    def _extract_tags(self, entry) -> List[str]:
        tags = []
        if hasattr(entry, "tags"):
            for tag in entry.tags:
                tags.append(tag.term)
        return tags[:5]
    
    def _classify_by_keywords(self, text: str) -> Optional[Category]:
        text_lower = text.lower()
        
        ai_keywords = ["ai", "llm", "gpt", "openai", "gemini", "claude", "machine learning", "neural", "chatbot", "model"]
        cyber_keywords = ["security", "hack", "breach", "cyber", "vulnerability", "malware", "ransomware"]
        web_keywords = ["javascript", "typescript", "react", "python", "web", "frontend", "backend", "api"]
        gaming_keywords = ["game", "gaming", "console", "playstation", "xbox", "nintendo", "steam"]
        bigtech_keywords = ["google", "microsoft", "apple", "amazon", "meta", "facebook", "tesla", "nvidia"]
        
        if any(kw in text_lower for kw in ai_keywords):
            return Category.AI
        elif any(kw in text_lower for kw in cyber_keywords):
            return Category.CYBERSECURITY
        elif any(kw in text_lower for kw in web_keywords):
            return Category.WEB_DEV
        elif any(kw in text_lower for kw in gaming_keywords):
            return Category.GAMING
        elif any(kw in text_lower for kw in bigtech_keywords):
            return Category.BIG_TECH
        elif any(name in text_lower for name in ["philippine", "ph", "manila", "filipino", "duterte", "marcos"]):
            return Category.PHILIPPINE
        return Category.GENERAL


class GitHubTrendingScraper:
    BASE_URL = "https://github.com/trending"
    
    def fetch_trending(self, language: Optional[str] = None) -> List[dict]:
        repos = []
        try:
            url = self.BASE_URL
            if language:
                url = f"{self.BASE_URL}/{language}"
            
            response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=15)
            soup = BeautifulSoup(response.text, "html.parser")
            
            articles = soup.select("article.Box-row")
            for article in articles[:20]:
                try:
                    repo_link = article.select_one("h2 a")
                    stars_str = article.select_one("a[href$='/stargazers']").text.strip()
                    forks_str = article.select_one("a[href$='/members']").text.strip()
                    today_stars = article.select_one(".d-inline-block.float-sm-right span").text.strip() if article.select_one(".d-inline-block.float-sm-right span") else "0"
                    
                    name = repo_link.text.strip().replace("\n", "").replace(" ", "")
                    url = f"https://github.com{repo_link['href']}"
                    desc_elem = article.select_one("p")
                    desc = desc_elem.text.strip() if desc_elem else None
                    lang_elem = article.select_one("span[data-view-component='true']")
                    lang = lang_elem.text.strip() if lang_elem else None
                    
                    repos.append({
                        "name": name,
                        "url": url,
                        "description": desc,
                        "stars": self._parse_number(stars_str),
                        "forks": self._parse_number(forks_str),
                        "language": lang,
                        "today_stars": self._parse_number(today_stars)
                    })
                except:
                    continue
        except Exception as e:
            print(f"GitHub trending error: {e}")
        
        return repos
    
    def _parse_number(self, text: str) -> int:
        text = text.replace(",", "").strip()
        multipliers = {"k": 1000, "K": 1000, "m": 1000000}
        for suffix, mult in multipliers.items():
            if suffix in text:
                return int(float(text.replace(suffix, "")) * mult)
        try:
            return int(text)
        except:
            return 0