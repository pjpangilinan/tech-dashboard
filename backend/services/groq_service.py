import os
import httpx
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"

class GroqService:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        self._client = None
    
    @property
    def client(self):
        if self._client is None:
            self._client = httpx.Client(timeout=30.0)
        return self._client
    
    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)
    
    def summarize(self, title: str, category: str = "General Tech") -> Optional[str]:
        if not self.is_configured:
            return None
        
        prompt = f"""You are a news summarizer. Given this headline, write a brief 2-3 sentence summary that captures the key point of this news story. Focus on WHAT happened and the main topic of this specific headline.

Headline: {title}

Summary:"""
        
        try:
            response = self._make_request(prompt)
            return response
        except Exception as e:
            print(f"Groq summarization error: {e}")
            return None
    
    def tag_article(self, title: str, summary: Optional[str] = None) -> Optional[dict]:
        if not self.is_configured:
            return None
        
        text = f"{title}. {summary or ''}"
        
        prompt = f"""Analyze this news article headline and generate 3-5 relevant tags. Tags should be short keywords or topics that relate to the headline. Include the main subject, key entities mentioned, and relevant categories.

Headline: {title}

Respond in this exact format:
TAGS: [tag1, tag2, tag3, ...]"""
        
        try:
            response = self._make_request(prompt)
            if response:
                lines = response.split('\n')
                tags = []
                
                for line in lines:
                    if line.startswith('TAGS:'):
                        tag_str = line.replace('TAGS:', '').strip()
                        tags = [t.strip() for t in tag_str.split(',') if t.strip()]
                
                if tags:
                    return {"tags": tags[:5]}
            return None
        except Exception as e:
            print(f"Groq tagging error: {e}")
            return None
    
    def _make_request(self, prompt: str) -> Optional[str]:
        if not self.api_key:
            return None
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": GROQ_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a helpful tech news assistant. Be concise and informative."
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            "temperature": 0.3,
            "max_tokens": 150
        }
        
        response = self.client.post(GROQ_API_URL, headers=headers, json=payload)
        
        if response.status_code == 200:
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
        elif response.status_code == 401:
            print("Invalid Groq API key - please check GROQ_API_KEY in backend/.env")
            return None
        elif response.status_code == 429:
            print("Groq rate limit reached - try again in a moment")
            return None
        elif response.status_code == 422:
            print(f"Groq validation error: {response.text}")
            return None
        else:
            print(f"Groq API error ({response.status_code}): {response.text[:200]}")
            return None


groq_service = GroqService()