import React, { useState, useEffect } from 'react';
import { ExecutionReport } from '../../types/execution';
import { StepTimeline } from './StepTimeline';
import { ScreenshotViewer } from './ScreenshotViewer';
import { InsightPanel } from './InsightPanel';
import { DownloadDropdown } from '../DownloadDropdown';
import ExecutionList from './ExecutionList';
import { API_ENDPOINTS } from '../../config/api';
import { Terminal, History, ChevronLeft, Share2 } from 'lucide-react';
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
          isSidebarOpen ? "w-[300px]" : "w-[32px] items-center" 
        )}
      >
        <div className={cn(
            "flex-none border-b border-zinc-900 bg-zinc-950/50 flex w-full", 
            // Fixed height h-12 (48px) for both states to match other headers perfectly
            isSidebarOpen ? "h-12 px-4 justify-between items-center" : "h-12 justify-center items-center p-0"
        )}>
           {isSidebarOpen ? (
               <>
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-zinc-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">History</span>
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => setIsSidebarOpen(false)}
                        className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-white transition-colors"
                        title="Collapse Sidebar"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                </div>
               </>
           ) : (
                <div className="flex flex-col items-center py-2">
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-1.5 rounded hover:bg-white/10 text-zinc-500 hover:text-white transition-colors"
                        title="Expand History"
                    >
                        <History className="w-3.5 h-3.5" />
                    </button>
                </div>
           )}
        </div>

        {/* Content - Hidden when collapsed */}
        <div className={cn("flex-1 w-full overflow-hidden transition-opacity duration-200", !isSidebarOpen && "opacity-0 invisible pointer-events-none")}>
            <ExecutionList 
                onSelect={handleRunSelect} 
                selectedRunId={activeReport?.run_id}
                className="w-full border-none" 
            />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 relative">
        {/* Removed Absolute Button: handled by persistent sidebar now */}

        {activeReport ? (
            <div className="flex-1 flex h-full overflow-hidden animate-in fade-in duration-300">
                {/* Timeline */}
                <div className="w-1/4 min-w-[260px] max-w-[320px] border-r border-zinc-900 overflow-y-auto scrollbar-hide bg-zinc-950/30">
                    <div className="h-12 border-b border-zinc-900 bg-black/20 flex items-center justify-between px-4"> {/* h-12 to match sidebar */ }
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
                    <div className="h-12 border-b border-zinc-900 bg-black/20 flex-none flex items-center justify-between px-4">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Insights</span>
                        <div className="flex items-center gap-1.5">
                            <DownloadDropdown runId={activeReport.run_id} type="execution" />
                            <button 
                                onClick={() => {
                                    const finalUrl = `${window.location.origin}${window.location.pathname}?report=${activeReport.run_id}`;
                                    navigator.clipboard.writeText(finalUrl);
                                    if ((window as any).addToast) {
                                        (window as any).addToast('success', 'Live share link copied!');
                                    }
                                }}
                                className="px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded text-[8px] font-black uppercase tracking-widest text-indigo-400 hover:bg-indigo-500/20 transition-all active:scale-95 flex items-center gap-1.5"
                            >
                                <Share2 className="w-3 h-3" />
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
            <div className="h-full w-full flex flex-col items-center justify-center select-none p-10 text-center relative overflow-hidden group">
                {/* Visual Anchor */}
                <div className="relative mb-8">
                    <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center shadow-sm">
                        <Terminal className="w-8 h-8 text-zinc-600" strokeWidth={1} />
                    </div>
                </div>

                {/* Content */}
                <div className="relative space-y-4 max-w-sm">
                    <div className="space-y-1">
                        <h3 className="text-[14px] font-black uppercase tracking-[0.4em] text-zinc-400">
                            Execution Explorer
                        </h3>
                        <div className="flex items-center justify-center gap-2">
                             <div className="h-[1px] w-4 bg-zinc-800" />
                             <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">System In Idle State</span>
                             <div className="h-[1px] w-4 bg-zinc-800" />
                        </div>
                    </div>
                    
                    <p className="text-[11px] text-zinc-700 leading-relaxed font-medium uppercase tracking-tight">
                        Launch a test flow to capture high-fidelity traces, 
                        automated insights, and multi-stage screenshots. 
                        Select a record from the history sidebar to begin analysis.
                    </p>
                    
                    <div className="pt-6 flex flex-wrap items-center justify-center gap-6 opacity-30 grayscale">
                         <div className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-zinc-600" />
                            <span className="text-[8px] font-black tracking-widest uppercase text-zinc-600">Trace Logs</span>
                         </div>
                         <div className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-zinc-600" />
                            <span className="text-[8px] font-black tracking-widest uppercase text-zinc-600">AI Analysis</span>
                         </div>
                         <div className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-zinc-600" />
                            <span className="text-[8px] font-black tracking-widest uppercase text-zinc-600">Snapshots</span>
                         </div>
                    </div>
                </div>

                {/* Bottom Border/Label */}
                <div className="absolute bottom-8 left-8 right-8 flex items-center justify-between pointer-events-none opacity-20">
                    <div className="text-[7px] font-mono text-zinc-500 uppercase tracking-tighter">BUILD_V1.4.2</div>
                    <div className="text-[7px] font-mono text-zinc-500 uppercase tracking-tighter">STDBY_MODE</div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
