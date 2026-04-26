import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api` 
  : '/api';

export interface Article {
  id: number;
  title: string;
  url: string;
  source: string;
  published_at: string | null;
  summary: string | null;
  category: string;
  tags: string[];
}

export interface UserPreferences {
  user_id: string;
  topics: string[];
  sources: string[];
}

export interface NewsSource {
  id: number;
  name: string;
  feed_url: string;
  site_url: string | null;
  enabled: boolean;
  is_custom: boolean;
  last_fetched: string | null;
}

export interface FeedValidationResult {
  valid: boolean;
  feed_url: string;
  title?: string;
  article_count: number;
  error?: string;
}

export type SortBy = 'date_desc' | 'date_asc' | 'source' | 'category';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export const newsApi = {
  getGlobalNews: (limit = 30, category?: string, sortBy?: SortBy) =>
    api.get('/news/global', { params: { limit, category, sort_by: sortBy } }),
  
  getPHNews: (limit = 20, sortBy?: SortBy) =>
    api.get('/news/ph', { params: { limit, sort_by: sortBy } }),
  
  getRecommendations: (topics: string[], limit = 10) =>
    api.get('/recommendations', { params: { topics, limit } }),
  
  searchNews: (query: string, limit = 20) =>
    api.get('/news/search', { params: { q: query, limit } }),
  
  refreshNews: () =>
    api.post('/refresh'),
  
  getCategories: () =>
    api.get('/news/categories'),
};

export const preferencesApi = {
  get: (userId = 'default') =>
    api.get('/preferences', { params: { user_id: userId } }),
  
  save: (preferences: UserPreferences, userId = 'default') =>
    api.post('/preferences', preferences, { params: { user_id: userId } }),
};

export const sourcesApi = {
  getAll: () =>
    api.get('/sources'),
  
  add: (source: { name: string; feed_url: string; site_url?: string }) =>
    api.post('/sources', source),
  
  validate: (feedUrl: string) =>
    api.post('/sources/validate', null, { params: { feed_url: feedUrl } }),
  
  toggle: (sourceId: number, enabled: boolean) =>
    api.patch('/sources', null, { params: { source_id: sourceId, enabled } }),
  
  delete: (sourceId: number) =>
    api.delete(`/sources/${sourceId}`),
};

export const aiApi = {
  summarize: (title: string, category?: string) =>
    api.get('/summarize', { params: { title, category } }),
};

export default api;