import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertOctagon, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '40px 20px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc',
          }}
        >
          <div
            className="ind-card"
            style={{
              maxWidth: '680px',
              width: '100%',
              padding: '32px',
              backgroundColor: '#ffffff',
              border: '2px solid #ef4444',
              borderRadius: '8px',
              boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626',
                  flexShrink: 0,
                }}
              >
                <AlertOctagon size={28} />
              </div>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Application Display Error Intercepted
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0 0' }}>
                  A UI rendering exception occurred. The system protected your active data and session state.
                </p>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '6px',
                padding: '14px',
                marginBottom: '20px',
                fontSize: '13px',
                fontFamily: 'monospace',
                color: '#991b1b',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '160px',
                overflowY: 'auto',
              }}
            >
              <strong>Error:</strong> {this.state.error?.message || 'Unknown render error'}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Home size={15} /> Try Dismissing
              </button>
              <button
                className="btn btn-primary"
                onClick={this.handleReset}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#2563eb' }}
              >
                <RefreshCw size={15} /> Reload Interface
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
