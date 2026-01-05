import React, { useState, useEffect } from 'react';
import { ExecutionReport } from '../../types/execution';
import { StepTimeline } from './StepTimeline';
import { ScreenshotViewer } from './ScreenshotViewer';
import { InsightPanel } from './InsightPanel';
import { DownloadDropdown } from '../DownloadDropdown';

interface Props {
  report: ExecutionReport;
  onBlockSelect?: (blockId: string) => void;
  selectedBlockId?: string | null;
}

export const ExecutionExplorer: React.FC<Props> = ({ 
  report, 
  onBlockSelect,
  selectedBlockId: externalSelectedId 
}) => {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);

  // Sync internal state with external prop, or auto-select
  useEffect(() => {
    if (externalSelectedId) {
      setInternalSelectedId(externalSelectedId);
    } else if (report.error?.related_block_id) {
      setInternalSelectedId(report.error.related_block_id);
    } else if (report.blocks.length > 0 && !internalSelectedId) {
      setInternalSelectedId(report.blocks[0].block_id);
    }
  }, [externalSelectedId, report, internalSelectedId]);

  const selectedBlock = report.blocks.find(b => b.block_id === internalSelectedId);

  return (
    <div className="flex h-full w-full bg-black text-white overflow-hidden border-t border-zinc-900 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Timeline (Left) */}
      <div className="w-1/4 min-w-[260px] max-w-[320px] border-r border-zinc-900 overflow-y-auto scrollbar-hide bg-zinc-950/30">
        <div className="p-3 border-b border-zinc-900 bg-black/20 flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Timeline</span>
            <span className="px-1.5 py-0.5 rounded-full bg-zinc-900 text-[8px] font-bold text-zinc-400 border border-white/5">
                {report.blocks.length} STEPS
            </span>
        </div>
        <StepTimeline 
          blocks={report.blocks} 
          selectedId={internalSelectedId} 
          onSelect={(id) => {
            setInternalSelectedId(id);
            onBlockSelect?.(id);
          }} 
        />
      </div>

      {/* Screenshot (Center) */}
      <div className="flex-1 bg-zinc-950 overflow-hidden relative border-r border-zinc-900">
        <div className="absolute top-4 left-4 z-20 px-2 py-1 bg-black/60 backdrop-blur-xl rounded border border-white/5 flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-zinc-500" />
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-400">Snapshot</p>
        </div>
        <div className="h-full w-full flex items-center justify-center p-4">
             <ScreenshotViewer screenshot={selectedBlock?.screenshot} />
        </div>
      </div>

      {/* Insight (Right) */}
      <div className="w-1/4 min-w-[300px] max-w-[400px] overflow-y-auto bg-black scrollbar-hide flex flex-col">
        <div className="p-3 border-b border-zinc-900 bg-black/20 flex-none flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Insights</span>
            <div className="flex items-center gap-1.5">
                <DownloadDropdown runId={report.run_id} type="execution" />
                <button 
                  onClick={() => {
                    const url = `${window.location.origin}${window.location.pathname}?report=${report.run_id}`;
                    navigator.clipboard.writeText(url);
                    // We'll rely on the parent or a custom toast to show success if possible, 
                    // but for now we'll assume it's copied. 
                    // (I'll add a simple notification if I can access the addToast function)
                    if ((window as any).addToast) {
                       (window as any).addToast('success', 'Share link copied to clipboard!');
                    }
                  }}
                  className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[8px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>
            </div>
        </div>
        <div className="flex-1">
            <InsightPanel block={selectedBlock} error={report.error} />
        </div>
      </div>
    </div>
  );
};
