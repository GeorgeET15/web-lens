import React, { useState, useEffect } from 'react';
import { ExecutionReport } from '../../types/execution';
import { StepTimeline } from './StepTimeline';
import { ScreenshotViewer } from './ScreenshotViewer';
import { InsightPanel } from './InsightPanel';
import { DownloadDropdown } from '../DownloadDropdown';
import { ExecutionList } from './ExecutionList';
import { API_ENDPOINTS } from '../../config/api';
import { Terminal, X, History, ChevronLeft } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  report: ExecutionReport | null; // Report can now be null
  onBlockSelect?: (blockId: string) => void;
  selectedBlockId?: string | null;
  className?: string;
  onClose?: () => void;
}

export const ExecutionExplorer: React.FC<Props> = ({ 
  report: initialReport, 
  onBlockSelect,
  selectedBlockId: externalSelectedId,
  className,
  onClose
}) => {
  const [activeReport, setActiveReport] = useState<ExecutionReport | null>(initialReport);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // If prop changes (e.g. from live stream), update active report
  useEffect(() => {
    if (initialReport) {
      setActiveReport(initialReport);
    }
  }, [initialReport]);

  // Sync selection
  useEffect(() => {
    if (externalSelectedId) {
      setInternalSelectedId(externalSelectedId);
    } else if (activeReport?.error?.related_block_id) {
      setInternalSelectedId(activeReport.error.related_block_id);
    } else if (activeReport && activeReport.blocks.length > 0 && !internalSelectedId) {
      setInternalSelectedId(activeReport.blocks[0].block_id);
    }
  }, [externalSelectedId, activeReport, internalSelectedId]);

  const handleRunSelect = async (runId: string) => {
    try {
      const res = await fetch(`${API_ENDPOINTS.BASE_URL}/api/executions/${runId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveReport(data);
        setInternalSelectedId(null);
      }
    } catch (err) {
      console.error('Failed to fetch detailed report:', err);
    }
  };

  const selectedBlock = activeReport?.blocks.find(b => b.block_id === internalSelectedId);

  return (
    <div className={cn("flex h-full w-full bg-black text-white overflow-hidden border-t border-zinc-900", className)}>
      {/* Sidebar (Execution List) */}
      <div 
        className={cn(
          "flex-none transition-all duration-300 border-r border-zinc-900 bg-black relative flex flex-col",
          isSidebarOpen ? "w-[300px]" : "w-0 overflow-hidden border-none"
        )}
      >
        <div className="flex-none p-4 border-b border-zinc-900 bg-zinc-950/50 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <Terminal className="w-4 h-4 text-zinc-500" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Execution History</span>
           </div>
           <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-white transition-colors"
                title="Collapse Sidebar"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {onClose && (
                <button 
                  onClick={onClose}
                  className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-white transition-colors border-l border-white/5 ml-1 pl-1"
                  title="Close Explorer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
           </div>
        </div>

        <ExecutionList 
           onSelect={handleRunSelect} 
           selectedRunId={activeReport?.run_id}
           className="w-full border-none" 
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 relative">
        {!isSidebarOpen && (
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="absolute top-2.5 left-2.5 z-20 p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded transition-all"
                title="Show History"
            >
                <History className="w-3.5 h-3.5" />
            </button>
        )}

        {activeReport ? (
            <div className="flex-1 flex h-full overflow-hidden animate-in fade-in duration-300">
                {/* Timeline */}
                <div className="w-1/4 min-w-[260px] max-w-[320px] border-r border-zinc-900 overflow-y-auto scrollbar-hide bg-zinc-950/30">
                    <div className="p-3 border-b border-zinc-900 bg-black/20 flex items-center justify-between pl-12"> {/* pl-12 to provide breathing room for the toggle button */}
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Execution Log</span>
                        <span className="px-1.5 py-0.5 rounded-full bg-zinc-900 text-[8px] font-bold text-zinc-400 border border-white/5">
                            {activeReport.blocks.length} STEPS
                        </span>
                    </div>
                    <StepTimeline 
                    blocks={activeReport.blocks} 
                    selectedId={internalSelectedId} 
                    onSelect={(id) => {
                        setInternalSelectedId(id);
                        onBlockSelect?.(id);
                    }} 
                    />
                </div>

                {/* Screenshot */}
                <div className="flex-1 bg-zinc-950 overflow-hidden relative border-r border-zinc-900">
                    <div className="absolute top-4 left-4 z-20 px-2 py-1 bg-black/60 backdrop-blur-xl rounded border border-white/5 flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-zinc-500" />
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Snapshot</p>
                    </div>
                    <div className="h-full w-full flex items-center justify-center p-4">
                        <ScreenshotViewer screenshot={selectedBlock?.screenshot} />
                    </div>
                </div>

                {/* Insight */}
                <div className="w-1/4 min-w-[300px] max-w-[400px] overflow-y-auto bg-black scrollbar-hide flex flex-col">
                    <div className="p-3 border-b border-zinc-900 bg-black/20 flex-none flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Insights</span>
                        <div className="flex items-center gap-1.5">
                            <DownloadDropdown runId={activeReport.run_id} type="execution" />
                            <button 
                            onClick={() => {
                                const finalUrl = `${window.location.origin}${window.location.pathname}?report=${activeReport.run_id}`;
                                navigator.clipboard.writeText(finalUrl);
                                if ((window as any).addToast) {
                                (window as any).addToast('success', 'Share link copied to clipboard!');
                                }
                            }}
                            className="px-2 py-1 bg-white/5 border border-border rounded text-[8px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all active:scale-95 flex items-center gap-1.5"
                            >
                            Share
                            </button>
                        </div>
                    </div>
                    <div className="flex-1">
                        <InsightPanel block={selectedBlock} error={activeReport.error} />
                    </div>
                </div>
            </div>
        ) : (
            <div className="h-full w-full flex flex-col items-center justify-center text-zinc-700 select-none p-10 text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center border border-white/5 mb-8">
                    <Terminal className="w-10 h-10 opacity-20" strokeWidth={1} />
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-zinc-400 mb-3">Execution Explorer</h3>
                <p className="text-[11px] opacity-40 max-w-[300px] leading-relaxed">
                    Select a run from the history sidebar to view detailed telemetry, screenshots, and insights.
                </p>
            </div>
        )}
      </div>
    </div>
  );
};
