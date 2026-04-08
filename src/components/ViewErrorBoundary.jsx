import React from 'react';

export default class ViewErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(`[${this.props.name || 'View'}] crash:`, error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px', maxWidth: 500, margin: '40px auto' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>!</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#1a1a1a' }}>
            This section encountered an error
          </h3>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16, lineHeight: 1.6 }}>
            Something went wrong loading this view. Your data is safe. Try going back or reloading.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => this.setState({ error: null })}
            >
              Try Again
            </button>
            <button
              className="btn btn-muted btn-sm"
              onClick={() => window.location.reload()}
            >
              Reload App
            </button>
          </div>
          {this.state.error?.message && (
            <details style={{ marginTop: 16, textAlign: 'left' }}>
              <summary style={{ fontSize: 12, color: '#9ca3af', cursor: 'pointer' }}>Technical details</summary>
              <pre style={{ fontSize: 11, color: '#6b7280', background: '#f5f6f8', padding: 10, borderRadius: 8, overflow: 'auto', marginTop: 8, whiteSpace: 'pre-wrap' }}>
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
