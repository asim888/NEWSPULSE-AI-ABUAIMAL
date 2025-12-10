import React, { Component, ReactNode, ErrorInfo } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Polyfill Process for Browser/Vite Environment to prevent crashes and ensure SDK compatibility
if (typeof window !== 'undefined') {
    const win = window as any;
    if (!win.process) win.process = { env: {} };
    if (!win.process.env) win.process.env = {};
    
    // Copy Vite environment variables to process.env
    try {
        // @ts-ignore
        if (import.meta && import.meta.env) {
             // @ts-ignore
            const env = import.meta.env;
            win.process.env = {
                ...win.process.env,
                ...env,
                // CRITICAL: MAP VITE_API_KEY TO API_KEY so GoogleGenAI SDK can find it
                API_KEY: env.VITE_API_KEY || env.API_KEY || win.process.env.API_KEY
            };
        }
    } catch (e) {
        console.warn("Environment variable polyfill error:", e);
    }
}

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, backgroundColor: '#000', color: '#D4AF37', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h1>News Pulse AI Encountered an Error</h1>
          <p>Please try refreshing the page.</p>
          <pre style={{ color: '#666', fontSize: '12px', marginTop: '20px' }}>
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
