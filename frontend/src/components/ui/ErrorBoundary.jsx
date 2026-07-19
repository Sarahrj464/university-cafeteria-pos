import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-8">
          <div className="max-w-xl rounded-3xl border border-red-200 bg-white shadow-2xl p-8 text-center">
            <h1 className="text-2xl font-bold text-red-700">Something went wrong</h1>
            <p className="mt-3 text-sm text-slate-600">
              An unexpected error occurred. Please refresh the page and try again.
            </p>
            <button
              className="mt-6 inline-flex items-center justify-center rounded-full bg-forest px-6 py-3 text-sm font-semibold text-cream hover:bg-forest-light"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
