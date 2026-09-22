import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex items-center justify-center p-8">
          <div className="max-w-md cortex-card p-8 text-center space-y-4 border-rose-500/30">
            <AlertTriangle className="h-10 w-10 text-rose-400 mx-auto" />
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Something went wrong</h3>
            <p className="text-xs text-rose-300/80 font-mono bg-[var(--bg-app)] p-3 rounded border border-[var(--border-subtle)] text-left overflow-x-auto">
              {this.state.error?.toString() || 'Unknown UI Error'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="cortex-btn-primary px-4 py-2 text-xs rounded-md flex items-center justify-center space-x-2 mx-auto cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
