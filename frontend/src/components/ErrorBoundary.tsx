import { Component, ReactNode } from 'react';
import { useTheme } from '../context/ThemeContext';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function ErrorFallback() {
  const { toggleTheme } = useTheme();
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div 
        className="rounded-xl p-8 max-w-md w-full text-center border"
        style={{ 
          backgroundColor: 'var(--bg-secondary)', 
          borderColor: 'var(--border-color)' 
        }}
      >
        <span className="material-symbols-outlined text-5xl mb-4 block" style={{ color: 'var(--error-color)' }}>
          error
        </span>
        <h2 
          className="text-xl font-semibold mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          Something went wrong
        </h2>
        <p 
          className="mb-4"
          style={{ color: 'var(--text-secondary)' }}
        >
          We encountered an unexpected error. Try refreshing the page.
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="btn btn-accent"
          >
            Refresh Page
          </button>
          <button
            onClick={toggleTheme}
            className="btn btn-ghost"
          >
            <span className="material-symbols-outlined mr-1">dark_mode</span>
            Toggle Theme
          </button>
        </div>
        {import.meta.env.DEV && (
          <details className="mt-4 text-left">
            <summary 
              className="cursor-pointer text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              Error Details (Dev Only)
            </summary>
            <pre 
              className="mt-2 p-3 rounded text-xs overflow-auto"
              style={{ 
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--error-color)' 
              }}
            >
              Check console for full error
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}