import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  onRefresh: () => void;
  onSort: () => void;
  sortBy: 'newest' | 'oldest';
  onSortOption: (option: 'newest' | 'oldest') => void;
  showSortMenu: boolean;
  refreshing?: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  compactMode: boolean;
  onCompactToggle: () => void;
  lastUpdated: Date | null;
  onSourcesClick: () => void;
  onShortcutsClick: () => void;
}

export default function Header({ 
  onRefresh, onSort, sortBy, onSortOption, showSortMenu, 
  refreshing, searchQuery, onSearchChange, compactMode, onCompactToggle, 
  lastUpdated, onSourcesClick, onShortcutsClick 
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    const mins = Math.floor((Date.now() - lastUpdated.getTime()) / 60000);
    if (mins < 1) return 'Updated just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <header 
      className="sticky top-0 w-full z-50 border-b"
      style={{ 
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
        boxShadow: 'var(--shadow-sm)'
      }}
      role="banner"
    >
      <div className="max-w-[800px] mx-auto px-4" style={{ background: 'var(--gradient-subtle)' }}>
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Up To Date
            </h1>
            {lastUpdated && (
              <span 
                className="text-[11px] px-2.5 py-1.5 rounded-lg hidden md:inline-flex"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
              >
                {formatLastUpdated()}
              </span>
            )}
          </div>
          
          <nav className="flex items-center gap-1" role="navigation" aria-label="Main navigation">
            <label className="sr-only" id="search-label">Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                aria-labelledby="search-label"
                className="input w-28 sm:w-40 text-xs"
              />
              {searchQuery ? (
                <button 
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--bg-tertiary)]"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label="Clear"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              ) : (
                <span 
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded hidden sm:block"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                >/</span>
              )}
            </div>
            
            <div className="divider mx-1" />
            
            <button 
              onClick={onCompactToggle}
              className={`icon-btn ${compactMode ? 'icon-btn-active' : ''}`}
              title={compactMode ? 'Expand' : 'Compact'}
              aria-label={compactMode ? 'Expanded view' : 'Compact view'}
            >
              <span className="material-symbols-outlined">{compactMode ? 'view_agenda' : 'view_headline'}</span>
            </button>
            
            <button 
              onClick={toggleTheme}
              className="icon-btn"
              title={`${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              aria-label="Toggle theme"
            >
              <span className="material-symbols-outlined">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
            </button>
            
            <button 
              onClick={onRefresh}
              disabled={refreshing}
              className={`icon-btn ${refreshing ? 'icon-btn-active' : ''}`}
              title="Refresh (R)"
              aria-label="Refresh"
            >
              <span className={`material-symbols-outlined ${refreshing ? 'animate-spin' : ''}`}>sync</span>
            </button>
            
            <button 
              onClick={onSort}
              className={`icon-btn ${showSortMenu ? 'icon-btn-active' : ''}`}
              title="Sort"
              aria-label="Sort"
              aria-expanded={showSortMenu}
            >
              <span className="material-symbols-outlined">sort</span>
            </button>
            
            <button 
              onClick={onSourcesClick}
              className="icon-btn"
              title="Sources"
              aria-label="News sources"
            >
              <span className="material-symbols-outlined">rss_feed</span>
            </button>
            
            <button 
              onClick={onShortcutsClick}
              className="icon-btn"
              title="Shortcuts (?)"
              aria-label="Keyboard shortcuts"
            >
              <span className="material-symbols-outlined">keyboard</span>
            </button>
          </nav>
        </div>
      </div>

      {showSortMenu && (
        <div 
          className="absolute right-4 top-[68px] modal-content py-2 min-w-[160px] animate-slideDown"
          role="menu"
          aria-label="Sort options"
        >
          <button
            onClick={() => onSortOption('newest')}
            role="menuitem"
            className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between"
            style={sortBy === 'newest' ? { color: 'var(--accent-color)' } : { color: 'var(--text-secondary)' }}
          >
            Newest First
            {sortBy === 'newest' && <span className="material-symbols-outlined text-base">check</span>}
          </button>
          <button
            onClick={() => onSortOption('oldest')}
            role="menuitem"
            className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between"
            style={sortBy === 'oldest' ? { color: 'var(--accent-color)' } : { color: 'var(--text-secondary)' }}
          >
            Oldest First
            {sortBy === 'oldest' && <span className="material-symbols-outlined text-base">check</span>}
          </button>
        </div>
      )}
    </header>
  );
}