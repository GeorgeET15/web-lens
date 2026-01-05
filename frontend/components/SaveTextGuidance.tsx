import { FileText, FileSearch } from 'lucide-react';

interface SaveTextGuidanceProps {
  onUseSavePageContent: () => void;
  onUseVerifyPageContent: () => void;
}

export function SaveTextGuidance({ onUseSavePageContent, onUseVerifyPageContent }: SaveTextGuidanceProps) {
  return (
    <div className="p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg space-y-3 mt-2">
      <div className="flex gap-2">
        <div className="text-amber-500 mt-0.5">⚠️</div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-amber-200">
            Unstable Element Detected
          </p>
          <p className="text-xs text-amber-200/70 leading-relaxed">
            This element's content changes and cannot be reliably re-identified.
            Saving its text would be flaky.
          </p>
        </div>
      </div>
      
      <div className="pl-6 space-y-2">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Recommended Alternatives</p>
        
        <button 
          onClick={onUseSavePageContent}
          className="w-full flex items-center gap-3 p-2 rounded bg-black/40 hover:bg-black/60 border border-white/5 hover:border-indigo-500/30 transition-all text-left group"
        >
          <div className="p-1.5 rounded bg-gray-800 text-gray-400 group-hover:text-indigo-400">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-medium text-gray-300 group-hover:text-white">Save Page Content</div>
            <div className="text-[10px] text-gray-500">Capture all text on the page instead</div>
          </div>
        </button>

        <button 
          onClick={onUseVerifyPageContent}
          className="w-full flex items-center gap-3 p-2 rounded bg-black/40 hover:bg-black/60 border border-white/5 hover:border-indigo-500/30 transition-all text-left group"
        >
          <div className="p-1.5 rounded bg-gray-800 text-gray-400 group-hover:text-indigo-400">
            <FileSearch className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-medium text-gray-300 group-hover:text-white">Verify Page Content</div>
            <div className="text-[10px] text-gray-500">Check if page contains specific text</div>
          </div>
        </button>
      </div>
    </div>
  );
}
