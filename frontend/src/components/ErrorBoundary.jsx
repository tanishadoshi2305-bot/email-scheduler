import { Component } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import BrandStamp from "./BrandStamp";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[Dispatch ErrorBoundary]", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReturnHome = () => {
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const message =
      this.state.error?.message ||
      "An unexpected rendering issue interrupted Dispatch Studio.";

    return (
      <div className="min-h-screen bg-[#FAF6F0] text-[#3A2327] flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-3xl bg-[#FAF6F0] border-2 border-[#3A2327] shadow-editorial overflow-hidden">
          <div className="bg-[#F3DCE6] border-b-[1.5px] border-[#3A2327] px-6 py-5 flex items-center justify-between gap-4">
            <BrandStamp variant="cream" size="sm" tilt="-rotate-2" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF0F2] border border-[#3A2327] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#8E2233]">
              <AlertCircle className="w-3.5 h-3.5" />
              Studio Error
            </span>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            <div className="space-y-2">
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#3A2327]">
                Something interrupted the page.
              </h1>
              <p className="text-sm text-[#3A2327]/75 leading-relaxed">
                Dispatch caught an unexpected application error instead of rendering a blank screen.
              </p>
            </div>

            <div className="rounded-2xl bg-white border-[1.5px] border-[#3A2327]/40 p-4 font-mono text-xs text-[#8E2233] break-words">
              {message}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 rounded-full bg-[#3A2327] border-[1.5px] border-[#3A2327] px-5 py-2.5 text-sm font-semibold text-[#FAF6F0] hover:bg-[#3A2327]/90 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Studio
              </button>
              <button
                type="button"
                onClick={this.handleReturnHome}
                className="inline-flex items-center rounded-full bg-[#FAF6F0] border-[1.5px] border-[#3A2327] px-5 py-2.5 text-sm font-semibold text-[#3A2327] hover:bg-[#F3DCE6]/60 transition"
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
