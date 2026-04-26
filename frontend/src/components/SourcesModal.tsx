import { useState, useEffect } from 'react';
import { sourcesApi, type NewsSource, type FeedValidationResult } from '../services/api';

interface SourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SourcesModal({ isOpen, onClose }: SourcesModalProps) {
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceName, setNewSourceName] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<FeedValidationResult | null>(null);
  const [error, setError] = useState('');
  const [toggleError, setToggleError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadSources();
    }
  }, [isOpen]);

  const loadSources = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await sourcesApi.getAll();
      setSources(res.data.sources);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load sources. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!newSourceUrl.trim()) return;
    
    setValidating(true);
    setValidationResult(null);
    setError('');
    
    try {
      const res = await sourcesApi.validate(newSourceUrl.trim());
      setValidationResult(res.data);
      
      if (res.data.valid && res.data.title && !newSourceName.trim()) {
        setNewSourceName(res.data.title);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to validate feed. Check the URL and try again.');
    } finally {
      setValidating(false);
    }
  };

  const handleAddSource = async () => {
    if (!newSourceUrl.trim() || !newSourceName.trim()) {
      setError('Please provide both a name and feed URL');
      return;
    }
    
    try {
      await sourcesApi.add({
        name: newSourceName.trim(),
        feed_url: newSourceUrl.trim(),
        site_url: validationResult?.valid ? newSourceUrl.trim() : undefined
      });
      
      setShowAddForm(false);
      setNewSourceUrl('');
      setNewSourceName('');
      setValidationResult(null);
      loadSources();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add source. Please try again.');
    }
  };

  const handleToggle = async (source: NewsSource) => {
    setToggleError('');
    try {
      await sourcesApi.toggle(source.id, !source.enabled);
      loadSources();
    } catch (err: any) {
      setToggleError(err.response?.data?.detail || 'Failed to toggle source');
    }
  };

  const handleDelete = async (source: NewsSource) => {
    if (!source.is_custom) return;
    
    if (!confirm(`Delete "${source.name}"? This cannot be undone.`)) return;
    
    try {
      await sourcesApi.delete(source.id);
      loadSources();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete source');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 backdrop-blur-sm" 
        onClick={onClose}
        style={{ backgroundColor: 'var(--modal-overlay, rgba(0,0,0,0.6))' }}
      />
      
      <div 
        className="relative rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden border"
        style={{ 
          backgroundColor: 'var(--bg-secondary)', 
          borderColor: 'var(--border-color)'
        }}
      >
        <div 
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            News Sources
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 max-h-[calc(80vh-160px)]">
          {(error || toggleError) && (
            <div 
              className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2"
              style={{ 
                backgroundColor: 'color-mix(in srgb, var(--error-color) 15%, transparent)',
                border: '1px solid var(--error-color)',
                color: 'var(--error-color)'
              }}
            >
              <span className="material-symbols-outlined">error</span>
              {error || toggleError}
            </div>
          )}
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div 
                className="w-8 h-8 border-2 rounded-full animate-spin"
                style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent-color)' }}
              />
              <span style={{ color: 'var(--text-muted)' }}>Loading sources...</span>
            </div>
          ) : sources.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-5xl mb-3 block" style={{ color: 'var(--text-muted)' }}>
                rss_feed
              </span>
              <p style={{ color: 'var(--text-secondary)' }}>No sources configured</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Add a custom feed below to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggle(source)}
                      className="relative w-10 h-6 rounded-full transition-colors"
                      style={{ 
                        backgroundColor: source.enabled ? 'var(--accent-color)' : 'var(--bg-hover)'
                      }}
                      aria-label={source.enabled ? 'Disable source' : 'Enable source'}
                    >
                      <div
                        className="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform"
                        style={{ 
                          transform: source.enabled ? 'translateX(20px)' : 'translateX(4px)'
                        }}
                      />
                    </button>
                    <div>
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {source.name}
                      </div>
                      <div 
                        className="text-sm truncate max-w-[300px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {source.feed_url}
                      </div>
                    </div>
                  </div>
                  
                  {source.is_custom && (
                    <button
                      onClick={() => handleDelete(source)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      title="Delete source"
                      aria-label="Delete source"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {showAddForm && (
            <div 
              className="mt-6 p-4 rounded-lg space-y-4"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Feed URL
                </label>
                <input
                  type="url"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder="https://example.com/feed.xml"
                  className="input w-full"
                />
              </div>
              
              <button
                onClick={handleValidate}
                disabled={!newSourceUrl.trim() || validating}
                className="btn btn-accent w-full"
              >
                {validating ? (
                  <>
                    <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
                    Validating...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined mr-2">check_circle</span>
                    Validate Feed
                  </>
                )}
              </button>
              
              {validationResult && (
                <div 
                  className="p-4 rounded-lg border"
                  style={{ 
                    backgroundColor: validationResult.valid 
                      ? 'color-mix(in srgb, var(--success-color) 10%, transparent)' 
                      : 'color-mix(in srgb, var(--error-color) 10%, transparent)',
                    borderColor: validationResult.valid ? 'var(--success-color)' : 'var(--error-color)'
                  }}
                >
                  {validationResult.valid ? (
                    <div>
                      <div className="font-medium flex items-center gap-2" style={{ color: 'var(--success-color)' }}>
                        <span className="material-symbols-outlined">check_circle</span>
                        Valid RSS/Atom Feed
                      </div>
                      <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Found {validationResult.article_count} articles
                      </div>
                      
                      <div className="mt-4">
                        <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                          Source Name
                        </label>
                        <input
                          type="text"
                          value={newSourceName}
                          onChange={(e) => setNewSourceName(e.target.value)}
                          placeholder="Give this source a name"
                          className="input w-full"
                        />
                      </div>
                      
                      <button
                        onClick={handleAddSource}
                        disabled={!newSourceName.trim()}
                        className="btn mt-4 w-full"
                        style={{ 
                          backgroundColor: 'var(--success-color)',
                          color: 'white'
                        }}
                      >
                        <span className="material-symbols-outlined mr-2">add</span>
                        Add Source
                      </button>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--error-color)' }}>
                      <div className="font-medium flex items-center gap-2">
                        <span className="material-symbols-outlined">error</span>
                        Invalid Feed
                      </div>
                      <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {validationResult.error || 'Could not parse RSS/Atom feed from this URL'}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div 
          className="px-6 py-4 border-t"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setError('');
              setValidationResult(null);
            }}
            className="btn btn-accent w-full"
          >
            {showAddForm ? (
              <>
                <span className="material-symbols-outlined mr-2">close</span>
                Cancel
              </>
            ) : (
              <>
                <span className="material-symbols-outlined mr-2">add</span>
                Add Custom Feed
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}