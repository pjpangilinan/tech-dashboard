import { useState, useEffect } from 'react';

interface TrendingTopic {
  word: string;
  count: number;
}

interface TrendingBarProps {
  onTopicClick?: (topic: string) => void;
}

export default function TrendingBar({ onTopicClick }: TrendingBarProps) {
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrending();
    const interval = setInterval(fetchTrending, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchTrending = async () => {
    try {
      const res = await fetch('/api/trending');
      const data = await res.json();
      setTrending(data.trending || []);
    } catch (error) {
      console.error('Failed to fetch trending:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 overflow-hidden pb-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton h-6 w-20 rounded-full" style={{ animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
    );
  }

  if (trending.length === 0) return null;

  const maxCount = Math.max(...trending.map(t => t.count));

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <span className="text-[10px] uppercase tracking-wider flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
          Trending
        </span>
        <span className="text-slate-500 flex-shrink-0">|</span>
        {trending.slice(0, 8).map((topic, index) => {
          const intensity = topic.count / maxCount;
          const fontSize = 10 + intensity * 4;
          const opacity = 0.6 + intensity * 0.4;
          
          return (
            <button
              key={topic.word}
              onClick={() => onTopicClick?.(topic.word)}
              className="flex-shrink-0 px-2 py-1 rounded-full transition-all duration-200 flex items-center justify-center gap-1 group"
              style={{ 
                backgroundColor: 'var(--bg-tertiary)',
                fontSize: `${fontSize}px`,
                opacity,
                animation: `fadeIn 0.3s ease-out ${index * 50}ms both`,
                minWidth: '40px'
              }}
            >
              <span className="group-hover:opacity-100 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                {topic.word}
              </span>
              <span className="text-[9px] opacity-60 group-hover:opacity-80 transition-opacity">
                {topic.count}
              </span>
            </button>
          );
        })}
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}