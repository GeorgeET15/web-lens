import React from 'react';
import { Info } from 'lucide-react';

export const AIDisclaimer: React.FC = () => {
  return (
    <div className="flex gap-3 p-4 rounded-lg bg-zinc-950 border border-dashed border-white/5 text-zinc-500">
      <Info size={14} className="shrink-0 mt-0.5" />
      <div className="space-y-1">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">AI Commentary</h4>
        <p className="text-[11px] leading-relaxed italic">
          Generated from existing execution data. 
          WebLens execution, evidence, and outcomes are fully deterministic and AI-independent.
        </p>
      </div>
    </div>
  );
};
