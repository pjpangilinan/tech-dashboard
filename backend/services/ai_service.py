import re
from typing import List, Optional
from collections import Counter


class AIService:
    def __init__(self):
        self.stopwords = set([
            "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
            "have", "has", "had", "do", "does", "did", "will", "would", "could",
            "should", "may", "might", "must", "can", "this", "that", "these", "those",
            "i", "you", "he", "she", "it", "we", "they", "what", "which", "who",
            "when", "where", "why", "how", "all", "each", "every", "both", "few",
            "more", "most", "other", "some", "such", "no", "nor", "not", "only",
            "own", "same", "so", "than", "too", "very", "just", "and", "but", "if",
            "or", "because", "as", "until", "while", "of", "at", "by", "for", "with",
            "about", "against", "between", "into", "through", "during", "before",
            "after", "above", "below", "to", "from", "up", "down", "in", "out",
            "on", "off", "over", "under", "again", "further", "then", "once", "here",
            "there", "all", "any", "both", "each", "few", "more", "most", "other",
            "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than",
            "too", "very", "one", "two", "three", "first", "new", "like", "said",
            "will", "would", "could", "should", "may", "might", "must", "shall",
            "need", "want", "use", "find", "give", "take", "get", "make", "know",
            "think", "see", "come", "look", "go", "give", "tell", "ask", "try"
        ])
    
    def summarize(self, text: str, max_sentences: int = 3) -> str:
        if not text or len(text) < 50:
            return text or ""
        
        sentences = self._split_sentences(text)
        if len(sentences) <= max_sentences:
            return text
        
        sentence_scores = {}
        words = self._tokenize(text)
        word_freq = Counter(words)
        max_freq = max(word_freq.values()) if word_freq else 1
        
        for sentence in sentences:
            sent_words = self._tokenize(sentence)
            if not sent_words:
                continue
            score = sum(word_freq.get(w, 0) / max_freq for w in sent_words) / len(sent_words)
            sentence_scores[sentence] = score
        
        top_sentences = sorted(sentence_scores.keys(), key=lambda s: sentence_scores[s], reverse=True)[:max_sentences]
        
        ordered = []
        for sentence in sentences:
            if sentence in top_sentences:
                ordered.append(sentence)
        
        return " ".join(ordered[:max_sentences])
    
    def classify(self, title: str, content: str = "") -> tuple[str, List[str]]:
        import re
        text = (title + " " + content).lower()
        
        ai_keywords = [
            "openai", "chatgpt", "gpt-4", "gpt-5", "claude", "gemini", "llama", "mistral",
            "sora", "copilot", "deepseek", "qwen", "grok",
            "artificial intelligence", "machine learning",
            "neural network", "nlp", "generative ai", "langchain", "rag", "transformer"
        ]
        cyber_keywords = [
            "malware", "ransomware", "phishing", "zero-day", "vulnerability",
            "breach", "exploit", "cyberattack", "security", "encryption",
            "privacy", "data leak", "threat", "firewall", "hack"
        ]
        web_keywords = [
            "javascript", "typescript", "react", "vue", "angular", "svelte",
            "django", "flask", "fastapi", "nodejs", "deno",
            "graphql", "css", "html", "frontend", "backend",
            "http"
        ]
        gaming_keywords = [
            "playstation", "xbox", "nintendo", "switch", "steam", "epic games",
            "ps5", "ps6", "vr", "metaverse", "gaming", "gamer"
        ]
        bigtech_keywords = [
            "google", "microsoft", "apple", "amazon", "meta", "facebook",
            "instagram", "twitter", "tesla", "nvidia", "amd", "intel"
        ]
        
        all_keywords = {
            "AI/LLMs": ai_keywords,
            "Cybersecurity": cyber_keywords,
            "Web Development": web_keywords,
            "Gaming Tech": gaming_keywords,
            "Big Tech": bigtech_keywords
        }
        
        category = "General Tech"
        tags = []
        
        found_category_scores = {}
        
        for cat, keywords in all_keywords.items():
            score = 0
            found_tags = []
            for kw in keywords:
                pattern = r'\b' + re.escape(kw) + r'\b'
                if re.search(pattern, text):
                    score += 1
                    found_tags.append(kw.replace(" ", "").replace("-", ""))
            if score > 0:
                found_category_scores[cat] = (score, found_tags)
        
        if found_category_scores:
            best_cat = max(found_category_scores.items(), key=lambda x: x[1][0])
            category = best_cat[0]
            tags = list(set(best_cat[1][1]))[:4]
        
        print(f"CLASSIFY result: title='{title[:30]}...' -> cat='{category}', tags={tags}")
        return category, tags
    
    def _split_sentences(self, text: str) -> List[str]:
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in sentences if s.strip()]
    
    def _tokenize(self, text: str) -> List[str]:
        words = re.findall(r'\b\w+\b', text.lower())
        return [w for w in words if w not in self.stopwords and len(w) > 2]


def recommend_articles(articles: List[dict], user_topics: List[str], limit: int = 10) -> List[dict]:
    if not user_topics:
        return articles[:limit]
    
    def score_article(article):
        score = 0
        category = article.get("category", "")
        tags = article.get("tags", [])
        
        for topic in user_topics:
            if topic.lower() in category.lower():
                score += 3
            if any(topic.lower() in str(tag).lower() for tag in tags):
                score += 2
            if topic.lower() in article.get("title", "").lower():
                score += 1
        
        return score
    
    scored = [(score_article(a), a) for a in articles]
    scored.sort(key=lambda x: x[0], reverse=True)
    
    return [a for _, a in scored[:limit]]