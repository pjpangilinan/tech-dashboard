import pytest
from services.ai_service import AIService


class TestClassification:
    def test_classify_ai_article(self):
        service = AIService()
        title = "OpenAI releases new GPT-5 model with advanced reasoning"
        category, tags = service.classify(title)
        assert category == "AI/LLMs"
        assert "openai" in tags or "gpt" in tags

    def test_classify_security_article(self):
        service = AIService()
        title = "Critical vulnerability found in popular software"
        category, tags = service.classify(title)
        assert category == "Cybersecurity"
        assert "vulnerability" in tags or "security" in tags

    def test_classify_gaming_article(self):
        service = AIService()
        title = "PlayStation 6 announced with ray tracing support"
        category, tags = service.classify(title)
        assert category == "Gaming Tech"
        assert "playstation" in tags or "ps6" in tags

    def test_classify_bigtech_article(self):
        service = AIService()
        title = "Google announces quarterly earnings, beats expectations"
        category, tags = service.classify(title)
        assert category == "Big Tech"
        assert "google" in tags

    def test_classify_general_article(self):
        service = AIService()
        title = "Technology industry sees growth in Q4"
        category, tags = service.classify(title)
        assert category == "General Tech"


class TestSummarization:
    def test_summarize_short_text(self):
        service = AIService()
        title = "Apple announces new iPhone"
        summary = service.summarize(title, max_sentences=3)
        assert summary is not None
        assert len(summary) > 0

    def test_summarize_long_text(self):
        service = AIService()
        text = "Major software update released. Features include improved performance. Security patches applied. Bug fixes included. New UI design introduced. Speed improvements noted. Better stability achieved."
        summary = service.summarize(text, max_sentences=3)
        assert summary is not None
        assert len(summary) > 50

    def test_summarize_empty_text(self):
        service = AIService()
        summary = service.summarize("", max_sentences=3)
        assert summary == ""


class TestUtilities:
    def test_tokenize(self):
        service = AIService()
        tokens = service._tokenize("OpenAI releases new AI model")
        assert "openai" in tokens
        assert "releases" in tokens

    def test_split_sentences(self):
        service = AIService()
        sentences = service._split_sentences("First sentence. Second sentence! Third?")
        assert len(sentences) >= 3

    def test_tokenize_removes_stopwords(self):
        service = AIService()
        tokens = service._tokenize("The quick brown fox jumps")
        assert "the" not in tokens
        assert "quick" in tokens