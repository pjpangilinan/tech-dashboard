import { useState } from 'react';
import type { Article } from '../types';
import { aiApi } from '../services/api';

interface ArticleCardProps {
  article: Article;
  compact?: boolean;
  onShare?: (url: string) => void;
  isSelected?: boolean;
}

const formatTimeAgo = (dateStr: string | null): string => {
  if (!dateStr) return 'Recently';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
};

const getSourceConfig = (source: string) => {
  const configs: Record<string, { icon: string; bg: string }> = {
    'Hacker News': { icon: 'Y', bg: 'linear-gradient(135deg, #ff6600 0%, #ff8533 100%)' },
    'The Verge': { icon: 'V', bg: 'linear-gradient(135deg, #d32f2f 0%, #ef5350 100%)' },
    'TechCrunch': { icon: 'TC', bg: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)' },
    'Rappler': { icon: 'RP', bg: 'linear-gradient(135deg, #1565c0 0%, #42a5f5 100%)' },
    'Inquirer': { icon: 'INQ', bg: 'linear-gradient(135deg, #c62828 0%, #ef5350 100%)' },
  };
  return configs[source] || { 
    icon: source.substring(0, 2).toUpperCase(), 
    bg: 'var(--gradient-accent)' 
  };
};

const SkeletonCard = () => (
  <div className="card p-5">
    <div className="flex items-center gap-3 mb-4">
      <div className="source-icon skeleton" style={{ width: 32, height: 32 }} />
      <div className="skeleton h-3 w-20" />
      <div className="skeleton h-3 w-12" />
    </div>
    <div className="skeleton h-5 w-full mb-2" />
    <div className="skeleton h-5 w-3/4" />
  </div>
);

const SkeletonCompact = () => (
  <div className="card px-4 py-3 flex items-center gap-3">
    <div className="skeleton" style={{ width: 28, height: 28, borderRadius: 8 }} />
    <div className="skeleton h-4 flex-1" />
    <div className="skeleton h-3 w-12" />
  </div>
);

export default function ArticleCard({ article, compact = false, isSelected = false }: ArticleCardProps) {
  const config = getSourceConfig(article.source);
  const [copied, setCopied] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(article.summary);
  const [showSummary, setShowSummary] = useState(!!article.summary);
  const [summaryError, setSummaryError] = useState(false);

  const handleClick = () => {
    window.open(article.url, '_blank', 'noopener,noreferrer');
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(article.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSummarize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (showSummary) {
      setShowSummary(false);
      return;
    }
    
    if (summary) {
      setShowSummary(true);
      return;
    }
    
    setSummarizing(true);
    setSummaryError(false);
    try {
      const res = await aiApi.summarize(article.title, article.category);
      if (res.data.summary) {
        setSummary(res.data.summary);
        setShowSummary(true);
      } else if (res.data.error) {
        setSummaryError(true);
      } else {
        setSummaryError(true);
      }
    } catch (err: any) {
      setSummaryError(true);
    } finally {
      setSummarizing(false);
    }
  };

  if (compact) {
    return (
      <article 
        onClick={handleClick}
        className="card card-hover px-4 py-3 flex items-center gap-3 cursor-pointer transition-all"
        style={isSelected ? { borderColor: 'var(--accent-color)', borderWidth: 2 } : {}}
      >
        <div className="source-icon flex-shrink-0" style={{ background: config.bg }}>
          {config.icon}
        </div>
        <h3 className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {article.title}
        </h3>
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{formatTimeAgo(article.published_at)}</span>
        <button onClick={handleShare} className="icon-btn flex-shrink-0" aria-label="Share">
          <span className="material-symbols-outlined text-base">{copied ? 'check' : 'share'}</span>
        </button>
      </article>
    );
  }

  return (
    <article 
      onClick={handleClick}
      className="card card-hover p-5 cursor-pointer transition-all"
      style={isSelected ? { borderColor: 'var(--accent-color)', borderWidth: 2 } : {}}
    >
      <div className="flex items-center justify-center gap-3 mb-3">
        <div className="source-icon" style={{ background: config.bg }}>
          {config.icon}
        </div>
        <span className="font-semibold text-sm" style={{ color: 'var(--accent-color)' }}>{article.source}</span>
        <span style={{ color: 'var(--text-muted)' }}>·</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatTimeAgo(article.published_at)}</span>
        <div className="ml-auto flex items-center justify-center gap-1">
          <button 
            onClick={handleSummarize}
            disabled={summarizing}
            className={`icon-btn ${showSummary ? 'icon-btn-active' : ''} ${summarizing ? 'animate-spin' : ''}`}
            aria-label={summarizing ? 'Generating' : 'Summarize'}
            title="AI Summary"
          >
            <span className="material-symbols-outlined text-base">
              {summarizing ? 'progress_activity' : showSummary ? 'lightbulb' : 'auto_awesome'}
            </span>
          </button>
          <button onClick={handleShare} className={`icon-btn ${copied ? 'icon-btn-active' : ''}`} aria-label="Share">
            <span className="material-symbols-outlined text-base">{copied ? 'check' : 'share'}</span>
          </button>
        </div>
      </div>
      
      <h2 className="text-[15px] font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
        {article.title}
      </h2>
      
      {showSummary && summary && (
        <div 
          className="text-[13px] leading-relaxed mt-3 p-4 rounded-lg border animate-fadeIn"
          style={{ 
            backgroundColor: 'var(--accent-bg)', 
            color: 'var(--text-secondary)',
            borderColor: 'var(--accent-color)'
          }}
        >
          {summary}
        </div>
      )}
      
      {summaryError && !summarizing && (
        <div 
          className="text-[12px] mt-3 p-3 rounded-lg flex items-center gap-2"
          style={{ 
            backgroundColor: 'color-mix(in srgb, var(--error-color) 10%, transparent)',
            color: 'var(--error-color)',
            border: '1px solid var(--error-color)'
          }}
        >
          <span className="material-symbols-outlined text-base">error</span>
          AI unavailable. Ensure GROQ_API_KEY is set in backend/.env
        </div>
      )}
    </article>
  );
}

export { SkeletonCard, SkeletonCompact, formatTimeAgo, getSourceConfig };