import React from 'react';
import { BlockExecution } from '../../types/execution';
import { Loader2 } from 'lucide-react';

interface Props {
  blocks: BlockExecution[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const StepTimeline: React.FC<Props> = ({ blocks, selectedId, onSelect }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (selectedId && scrollRef.current) {
      const element = document.getElementById(`step-${selectedId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedId]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-zinc-800 sticky top-0 bg-black z-10 flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Execution Log</h3>
        <span className="text-[9px] text-zinc-600 font-mono">Evidence: {blocks.length}</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide pb-20">
        {blocks.map((block, index) => (
          <button
            key={`${block.block_id}-${index}`}
            id={`step-${block.block_id}`}
            onClick={() => onSelect(block.block_id)}
            className={`w-full text-left p-5 border-b border-zinc-900/50 transition-all flex items-start gap-4 hover:bg-zinc-900/40 relative group ${
              selectedId === block.block_id ? 'bg-zinc-900/60 shadow-[inset_4px_0_0_#ffffff] ring-1 ring-inset ring-white/5' : ''
            }`}
          >
            <div className={`mt-1 w-2.5 h-2.5 rounded-full border-2 shrink-0 transition-all ${
              block.status === 'success' ? 'bg-white border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 
              block.status === 'failed' ? 'bg-rose-500 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 
              'bg-blue-500 border-blue-500 animate-pulse'
            }`} />
            
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black uppercase tracking-widest text-zinc-300">
                  {block.block_type.replace(/_/g, ' ')}
                </span>
                <span className="text-[9px] font-mono text-zinc-600 tabular-nums">
                  {(block.duration_ms / 1000).toFixed(2)}s
                </span>
              </div>
              <div className="text-[12px] text-zinc-500 italic font-medium truncate leading-relaxed flex items-center gap-2">
                {block.message || block.taf.trace[0] || block.taf.analysis[0] || (
                  (block.status === 'success' || block.status === 'failed') ? (
                    <span className="opacity-70 uppercase tracking-tighter text-[10px] font-black italic">
                      {block.status === 'success' ? 'Step verified' : 'Anomaly detected'}
                    </span>
                  ) : (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-zinc-700" />
                      <span className="opacity-50">Reviewing outcome</span>
                    </>
                  )
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
