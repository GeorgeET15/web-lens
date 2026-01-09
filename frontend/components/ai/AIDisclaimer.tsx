import React from 'react';
import { Info } from 'lucide-react';

export const AIDisclaimer: React.FC = () => {
  return (
    <div className="flex gap-3 p-4 rounded-lg bg-zinc-950 border border-dashed border-white/5 text-zinc-500">
      <Info size={14} className="shrink-0 mt-0.5" />
      <div className="space-y-1">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
          AI Commentary
          <span className="px-1.5 py-0.5 rounded-full bg-zinc-900 border border-white/10 text-[7px] font-bold text-zinc-500">
            EXPERIMENTAL
          </span>
        </h4>
        <p className="text-[11px] leading-relaxed italic">
          Generated from existing execution data. 
          WebLens execution, evidence, and outcomes are fully deterministic and AI-independent.
        </p>
      </div>
    </div>
  );
};
