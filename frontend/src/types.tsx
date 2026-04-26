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

export type Category = 
  | 'AI/LLMs'
  | 'Cybersecurity'
  | 'Big Tech'
  | 'Web Development'
  | 'Gaming Tech'
  | 'Philippine Tech'
  | 'General Tech';

export const CATEGORIES: Category[] = [
  'AI/LLMs',
  'Cybersecurity',
  'Big Tech',
  'Web Development',
  'Gaming Tech',
  'Philippine Tech',
  'General Tech'
];