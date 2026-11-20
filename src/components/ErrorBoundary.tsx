import { Component, type ErrorInfo, type ReactNode } from 'react';

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
    console.error('Zenith error boundary caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            textAlign: 'center',
            background: '#070606',
            color: '#fff',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              color: '#ef4444',
              fontSize: 24,
            }}
          >
            !
          </div>
          <h2 style={{ fontSize: 20, marginBottom: 8, fontWeight: 600 }}>Something went wrong</h2>
          <p style={{ color: '#888', fontSize: 14, marginBottom: 20, maxWidth: 320 }}>
            Zenith encountered an issue loading this view.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.hash = '#/';
              window.location.reload();
            }}
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              background: '#22c55e',
              color: '#000',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Reload workspace
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
