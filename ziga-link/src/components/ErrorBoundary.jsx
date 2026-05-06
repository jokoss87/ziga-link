import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
    this.setState({ errorInfo: info });
  }

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-stone-50">
          <div className="text-5xl mb-4">🐾</div>
          <h2 className="text-xl font-black text-stone-800 mb-2">Oups, quelque chose s'est mal passé</h2>
          <p className="text-stone-500 text-sm mb-6">
            Une erreur inattendue s'est produite. Essayez de recharger la page.
          </p>
          {isDev && this.state.error && (
            <div className="w-full max-w-2xl text-left mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 overflow-auto max-h-64">
              <p className="text-red-700 font-bold text-sm mb-2">🔴 {this.state.error.toString()}</p>
              {this.state.errorInfo?.componentStack && (
                <pre className="text-xs text-red-600 whitespace-pre-wrap leading-relaxed">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>
          )}
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, errorInfo: null });
              window.location.reload();
            }}
            className="px-6 py-3 rounded-2xl text-white font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
          >
            Recharger l'application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}