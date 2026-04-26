import { useState, useEffect, useCallback, useRef } from 'react';
import { newsApi } from './services/api';
import type { Article } from './types';
import Header from './components/Header';
import ArticleCard, { SkeletonCard, SkeletonCompact } from './components/ArticleCard';
import TrendingBar from './components/TrendingBar';
import ErrorBoundary from './components/ErrorBoundary';
import SourcesModal from './components/SourcesModal';
import ShortcutsModal from './components/ShortcutsModal';
import { useTheme } from './context/ThemeContext';

export default function App() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [phArticles, setPhArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [displayCount, setDisplayCount] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [compactMode, setCompactMode] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [newArticlesCount, setNewArticlesCount] = useState(0);
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [selectedArticleIndex, setSelectedArticleIndex] = useState(-1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { toggleTheme } = useTheme();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [globalRes, phRes] = await Promise.all([
        newsApi.getGlobalNews(100),
        newsApi.getPHNews(100)
      ]);
      
      setArticles(globalRes.data);
      setPhArticles(phRes.data);
      setLastUpdated(new Date());
    } catch (error: any) {
      console.error('Error loading data:', error);
      setLoadError(error.response?.data?.detail || 'Failed to load articles. Is the server running?');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:8000/api/stream');
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.error) {
          return;
        }
        
        const newArticles: Article[] = data.articles || [];
        
        setArticles(prev => {
          const existingIds = new Set(prev.map((a: Article) => a.id));
          const incoming = newArticles.filter((a: Article) => !existingIds.has(a.id));
          
          if (incoming.length > 0) {
            setNewArticlesCount((prev: number) => prev + incoming.length);
            return [...incoming, ...prev];
          }
          return prev;
        });
      } catch (e) {
        // connection failed, just ignore it
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'r':
          if (!refreshing) handleRefresh();
          break;
        case 'j':
          setSelectedArticleIndex(prev => Math.min(prev + 1, sortedArticles.length - 1));
          break;
        case 'k':
          setSelectedArticleIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'enter':
          if (selectedArticleIndex >= 0 && sortedArticles[selectedArticleIndex]) {
            window.open(sortedArticles[selectedArticleIndex].url, '_blank');
          }
          break;
        case 'c':
          setCompactMode(prev => !prev);
          break;
        case 'd':
          toggleTheme();
          break;
        case '?':
          setShowShortcutsModal(true);
          break;
        case 's':
          if (!e.metaKey && !e.ctrlKey) {
            setShowSourcesModal(true);
          }
          break;
        case '/':
          searchInputRef.current?.focus();
          break;
        case 'escape':
          setShowShortcutsModal(false);
          setShowSourcesModal(false);
          setShowSortMenu(false);
          setSearchQuery('');
          setSelectedArticleIndex(-1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refreshing, selectedArticleIndex, articles.length, phArticles.length]);

  useEffect(() => {
    setSelectedArticleIndex(-1);
  }, [searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await newsApi.refreshNews();
      const [globalRes, phRes] = await Promise.all([
        newsApi.getGlobalNews(100),
        newsApi.getPHNews(100)
      ]);
      setArticles(globalRes.data);
      setPhArticles(phRes.data);
      setLastUpdated(new Date());
      setNewArticlesCount(0);
    } catch (error) {
      console.error('Refresh error:', error);
    }
    setRefreshing(false);
  };

  const handleLoadNew = () => {
    setNewArticlesCount(0);
    loadData();
  };

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + 20);
  };

  const handleTrendingClick = (topic: string) => {
    setSearchQuery(topic);
  };

  const allArticles = [...articles, ...phArticles];
  
  let filteredArticles = allArticles;

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredArticles = filteredArticles.filter(a => 
      a.title.toLowerCase().includes(query) ||
      a.source.toLowerCase().includes(query) ||
      a.summary?.toLowerCase().includes(query)
    );
  }

  const sortedArticles = [...filteredArticles].sort((a, b) => {
    const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
    const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
    return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
  });

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-[800px] mx-auto px-4 py-4">
          {loadError ? (
            <div 
              className="rounded-xl p-8 text-center border"
              style={{ 
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--error-color)'
              }}
            >
              <span className="material-symbols-outlined text-5xl mb-4 block" style={{ color: 'var(--error-color)' }}>
                wifi_off
              </span>
              <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Unable to Load Articles
              </h2>
              <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
                {loadError}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={loadData}
                  className="btn btn-accent"
                >
                  <span className="material-symbols-outlined mr-1">refresh</span>
                  Try Again
                </button>
                <button
                  onClick={toggleTheme}
                  className="btn btn-ghost"
                >
                  <span className="material-symbols-outlined mr-1">dark_mode</span>
                  Toggle Theme
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="h-14 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2" style={{ borderColor: 'var(--accent-color)', borderTopColor: 'transparent' }} />
              </div>
              <div className="flex flex-col gap-3">
                {[...Array(5)].map((_, i) => (
                  compactMode ? <SkeletonCompact key={i} /> : <SkeletonCard key={i} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className="min-h-screen">
<Header
          onRefresh={handleRefresh}
          onSort={() => setShowSortMenu(!showSortMenu)}
          sortBy={sortBy}
          onSortOption={setSortBy}
          showSortMenu={showSortMenu}
          refreshing={refreshing}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          compactMode={compactMode}
          onCompactToggle={() => setCompactMode(!compactMode)}
          lastUpdated={lastUpdated}
          onSourcesClick={() => setShowSourcesModal(true)}
          onShortcutsClick={() => setShowShortcutsModal(true)}
        />
      
      <div className="max-w-[800px] mx-auto px-4 py-4">
        {newArticlesCount > 0 && (
          <button 
            onClick={handleLoadNew}
            className="w-full mb-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.01]"
            style={{ 
              backgroundColor: 'var(--accent-color)', 
              color: 'white',
              boxShadow: 'var(--shadow-md)'
            }}
          >
            <span className="material-symbols-outlined text-lg">expand_more</span>
            {newArticlesCount} new articles
          </button>
        )}
        
        <TrendingBar onTopicClick={handleTrendingClick} />
        
        <div className="flex flex-col gap-3">
          {sortedArticles.length === 0 ? (
            <div 
              className="rounded-xl p-12 text-center"
              style={{ 
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)'
              }}
            >
              <span className="material-symbols-outlined text-5xl mb-4 block" style={{ color: 'var(--text-muted)' }}>search_off</span>
              <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No articles found for "{searchQuery}"</p>
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-4 text-sm font-medium hover:underline"
                style={{ color: 'var(--accent-color)' }}
              >
                Clear search
              </button>
            </div>
          ) : (
            sortedArticles.slice(0, displayCount).map((article, index) => (
              <div 
                key={article.id} 
                className="animate-fadeIn"
                style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
                tabIndex={selectedArticleIndex === index ? 0 : -1}
                aria-selected={selectedArticleIndex === index}
              >
                <ArticleCard 
                  article={article} 
                  compact={compactMode} 
                  isSelected={selectedArticleIndex === index}
                />
              </div>
            ))
          )}
        </div>

        {sortedArticles.length > displayCount && (
          <div className="mt-8 flex justify-center pb-8">
            <button 
              onClick={handleLoadMore}
              className="text-[13px] flex items-center gap-2 transition-colors px-4 py-2 rounded-lg"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span className="material-symbols-outlined text-[18px]">expand_more</span>
              Load More
            </button>
          </div>
        )}
      </div>
      
      <SourcesModal
        isOpen={showSourcesModal}
        onClose={() => setShowSourcesModal(false)}
      />
      
      <ShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />
    </div>
    </ErrorBoundary>
  );
}