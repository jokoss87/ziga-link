import { Component } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Error Boundary global — capture les crashs React et les log dans AppLog
 */
export default class MonitoringBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    try {
      base44.entities.AppLog.create({
        level: "critical",
        category: "react_crash",
        message: error?.message || "React crash",
        details: String(error),
        stack: info?.componentStack || error?.stack || null,
        page: window.location.pathname,
        resolved: false,
      });
    } catch (_) {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-4">💥</div>
            <h2 className="text-xl font-black text-stone-800 mb-2">Une erreur est survenue</h2>
            <p className="text-stone-400 text-sm mb-5">L'erreur a été enregistrée automatiquement.</p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
              className="px-6 py-3 rounded-2xl text-white font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #4CAF87, #3d9e78)" }}
            >
              Recharger l'application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}