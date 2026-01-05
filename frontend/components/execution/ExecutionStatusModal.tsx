import React, { useEffect, useState } from 'react';
import { 
  Loader2, CheckCircle2, XCircle, 
  Activity, Zap, Terminal, Clock
} from 'lucide-react';
import { API_ENDPOINTS } from '../../config/api';

interface ExecutionStatusModalProps {
  suiteId: string | null;
  totalScenarios?: number;
  mode?: 'validation' | 'execution';
  onComplete: (report: any) => void;
  onCancel: () => void;
}

interface SuiteStatus {
  suite_id: string;
  status: 'running' | 'completed' | 'failed';
  file_name: string;
  total: number;
  current: number;
  current_scenario: string;
  current_step: string;
  results: any[];
  started_at: number;
  finished_at: number | null;
  error?: string;
}

export const ExecutionStatusModal: React.FC<ExecutionStatusModalProps> = ({ 
  suiteId, 
  totalScenarios = 0,
  mode = 'execution',
  onComplete, 
  onCancel 
}) => {
  const [status, setStatus] = useState<SuiteStatus | null>(null);

  useEffect(() => {
    if (!suiteId) return;

    const eventSource = new EventSource(`${API_ENDPOINTS.BASE_URL}/api/scenarios/status/${suiteId}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'error') {
        eventSource.close();
        onCancel();
        return;
      }

      setStatus(data);

      if (data.status === 'completed') {
        eventSource.close();
        // Give it a moment for the user to see the "100%" state
        setTimeout(() => {
          onComplete(data);
        }, 1200);
      } else if (data.status === 'failed') {
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [suiteId]);

  const isValidation = mode === 'validation';
  const total = status?.total || totalScenarios || 0;
  const current = status?.current || 0;
  const progress = total > 0 ? Math.max(5, (current / total) * 100) : (isValidation ? 50 : 5);
  const passed = status ? status.results.filter(r => r.success).length : 0;
  const failed = status ? status.results.filter(r => !r.success).length : 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-xl bg-zinc-950 border border-white/10 rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden scale-in-center">
        {/* Header */}
        <div className="p-8 border-b border-white/5 bg-zinc-900/40 relative">
          <div className="absolute top-0 left-0 w-full h-1">
             <div 
                className={`h-full bg-white transition-all duration-700 ease-out shadow-[0_0_20px_rgba(255,255,255,0.5)] ${!status && isValidation ? 'animate-pulse' : ''}`} 
                style={{ width: `${progress}%` }} 
             />
          </div>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
               <div className="p-2.5 rounded bg-white text-black shadow-lg">
                  <Activity className={`w-5 h-5 ${suiteId || isValidation ? 'animate-pulse' : 'animate-bounce'}`} />
               </div>
               <div>
                  <h2 className="text-xl font-black uppercase tracking-tighter">
                    {isValidation ? 'Smart Validation' : (suiteId ? 'Live Execution' : 'Preparing Engine')}
                  </h2>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                    {isValidation ? 'Cross-referencing CSV headers...' : (status?.file_name || 'Connecting to browser...')}
                  </p>
               </div>
            </div>
            <div className="bg-zinc-800/50 border border-white/5 px-3 py-1.5 rounded-full flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${suiteId || isValidation ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    {isValidation ? 'Processing' : (suiteId ? 'Live Stream' : 'Initial Request')}
                </span>
            </div>
          </div>

          {/* Granular Status */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                    {isValidation ? 'Validating CSV Structure' : `Scenario ${current} of ${total}`}
                </span>
                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{Math.round(progress)}%</span>
             </div>
             <div className="p-5 rounded-xl bg-black border border-white/5 relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                <div className="flex items-start gap-4">
                    <div className="p-2 rounded bg-white/5 text-zinc-400 group-hover:text-white transition-colors">
                        <Terminal className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-black uppercase tracking-wider text-white truncate mb-1">
                            {isValidation ? 'Checking column mapping...' : (status?.current_scenario || 'Connecting to backend...')}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 italic font-medium">
                            <Zap className="w-3 h-3 text-indigo-400 fill-indigo-400/20" />
                            {isValidation ? 'Ensuring block compatibility' : (status?.current_step || 'Awaiting stream...')}
                        </div>
                    </div>
                    <Loader2 className="w-5 h-5 text-zinc-600 animate-spin flex-none" />
                </div>
             </div>
          </div>
        </div>

        {/* Results Summary Mini-Ribbon */}
        <div className="grid grid-cols-3 bg-zinc-950 px-8 py-5 gap-4">
            <div className="flex flex-col gap-1">
                <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Passed</span>
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-lg font-black">{passed}</span>
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Failed</span>
                <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-500" />
                    <span className="text-lg font-black">{failed}</span>
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <span className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Elapsed</span>
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    <span className="text-lg font-black">
                        {status?.started_at ? (Math.max(0, (status.finished_at || (Date.now() / 1000)) - status.started_at)).toFixed(1) : '0.0'}s
                    </span>
                </div>
            </div>
        </div>

        {/* Action Bar */}
        <div className="p-6 border-t border-white/5 bg-zinc-900/20 text-center">
            {status?.status === 'failed' ? (
                <div className="mb-4 p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold">
                    Critical Error: {status.error}
                </div>
            ) : null}
            <button 
                onClick={onCancel}
                className="px-8 py-2.5 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
            >
                {status?.status === 'completed' ? 'Close Status' : 'Cancel Execution'}
            </button>
        </div>
      </div>
    </div>
  );
};
