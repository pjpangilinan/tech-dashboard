interface Shortcut {
  key: string;
  description: string;
  category: string;
}

const SHORTCUTS: Shortcut[] = [
  { key: 'R', description: 'Refresh news feed', category: 'Navigation' },
  { key: 'J', description: 'Select next article', category: 'Navigation' },
  { key: 'K', description: 'Select previous article', category: 'Navigation' },
  { key: 'Enter', description: 'Open selected article', category: 'Navigation' },
  { key: 'Esc', description: 'Close modal / Clear search', category: 'Navigation' },
  { key: '/', description: 'Focus search bar', category: 'Search' },
  { key: 'C', description: 'Toggle compact mode', category: 'View' },
  { key: 'D', description: 'Toggle dark/light mode', category: 'View' },
  { key: '?', description: 'Show keyboard shortcuts', category: 'Help' },
  { key: 'S', description: 'Open sources panel', category: 'Sources' },
];

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  if (!isOpen) return null;

  const categories = [...new Set(SHORTCUTS.map(s => s.category))];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4" 
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div 
        className="absolute inset-0 backdrop-blur-sm" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div 
        className="relative rounded-xl w-full max-w-md border animate-slideUp"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h2 id="shortcuts-title" className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close shortcuts dialog"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {categories.map(category => (
            <div key={category}>
              <h3 
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'var(--text-muted)' }}
              >
                {category}
              </h3>
              <div className="space-y-2">
                {SHORTCUTS.filter(s => s.category === category).map(shortcut => (
                  <div 
                    key={shortcut.key}
                    className="flex items-center justify-between py-1"
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>{shortcut.description}</span>
                    <kbd 
                      className="px-2 py-1 rounded text-xs font-mono border"
                      style={{ 
                        backgroundColor: 'var(--bg-tertiary)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}