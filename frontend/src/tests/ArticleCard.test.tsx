import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ArticleCard, { SkeletonCard, SkeletonCompact } from '../components/ArticleCard';
import type { Article } from '../types';

describe('ArticleCard', () => {
  const mockArticle: Article = {
    id: 1,
    title: 'OpenAI announces GPT-5 breakthrough',
    url: 'https://example.com/article',
    source: 'The Verge',
    published_at: new Date().toISOString(),
    summary: 'A test summary',
    category: 'AI/LLMs',
    tags: [],
  };

  it('renders article title', () => {
    render(<ArticleCard article={mockArticle} />);
    expect(screen.getByText('OpenAI announces GPT-5 breakthrough')).toBeInTheDocument();
  });

  it('renders source name', () => {
    render(<ArticleCard article={mockArticle} />);
    expect(screen.getByText('The Verge')).toBeInTheDocument();
  });

  it('renders summary when available', () => {
    render(<ArticleCard article={mockArticle} />);
    expect(screen.getByText('A test summary')).toBeInTheDocument();
  });

  it('opens article in new tab on click', async () => {
    const user = userEvent.setup();
    render(<ArticleCard article={mockArticle} />);
    
    const openMock = vi.fn();
    vi.stubGlobal('open', openMock);
    
    await user.click(screen.getByRole('article'));
    
    expect(openMock).toHaveBeenCalledWith(
      'https://example.com/article',
      '_blank',
      'noopener,noreferrer'
    );
    
    vi.unstubAllGlobals();
  });
});

describe('SkeletonCard', () => {
  it('renders loading skeleton', () => {
    render(<SkeletonCard />);
    const skeletons = document.querySelectorAll('.skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders compact skeleton', () => {
    render(<SkeletonCompact />);
    const skeletons = document.querySelectorAll('.skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});