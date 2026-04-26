import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import sys
sys.path.insert(0, 'D:/Here/tech-dashboard/backend')

from main import app
from db.database import Base, get_db


SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(test_db):
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


class TestHealthEndpoints:
    def test_root(self, client):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "endpoints" in data

    def test_categories(self, client):
        response = client.get("/api/news/categories")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) > 0


class TestNewsEndpoints:
    def test_global_news_empty(self, client):
        response = client.get("/api/news/global")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_ph_news_empty(self, client):
        response = client.get("/api/news/ph")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_global_news_with_limit(self, client):
        response = client.get("/api/news/global?limit=5")
        assert response.status_code == 200

    def test_trending_empty(self, client):
        response = client.get("/api/trending")
        assert response.status_code == 200
        data = response.json()
        assert "trending" in data
        assert isinstance(data["trending"], list)


class TestSearchEndpoint:
    def test_search_requires_query(self, client):
        response = client.get("/api/news/search")
        assert response.status_code == 422

    def test_search_with_query(self, client):
        response = client.get("/api/news/search?q=test")
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert "query" in data
        assert data["query"] == "test"


class TestPreferencesEndpoint:
    def test_get_preferences(self, client):
        response = client.get("/api/preferences")
        assert response.status_code == 200

    def test_get_preferences_with_user_id(self, client):
        response = client.get("/api/preferences?user_id=test_user")
        assert response.status_code == 200