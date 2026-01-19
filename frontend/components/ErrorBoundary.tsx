import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-black p-6 z-[1000]">
          <div className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <h1 className="text-xl font-black uppercase tracking-tighter text-white mb-2">Workspace Crash</h1>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-6">
              A UI component encountered a critical error.
            </p>
            
            <div className="bg-black/50 border border-white/5 rounded-lg p-4 mb-8 text-left overflow-auto max-h-32">
                <p className="text-[10px] font-mono text-rose-400 leading-relaxed">
                    {this.state.error?.message || 'Unknown render error'}
                </p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 w-full py-3 bg-white text-black rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
