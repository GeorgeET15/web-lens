import React from 'react';
import { Save, Cloud, HardDrive } from 'lucide-react';
import { BaseDialog } from './BaseDialog';

interface SaveFlowDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCloud: () => void;
  onSaveLocal: () => void;
}

export const SaveFlowDialog: React.FC<SaveFlowDialogProps> = ({ 
  isOpen, 
  onClose, 
  onSaveCloud, 
  onSaveLocal 
}) => {
  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onSaveCloud}
      title="Save Flow"
      description="Where would you like to save this flow? Cloud storage allows access from anywhere, while Local storage stays on this device."
      icon={Save}
      confirmLabel="Cloud Storage"
      cancelLabel="Cancel"
    >
      <div className="grid grid-cols-1 gap-2 mt-4">
        <button 
          onClick={onSaveLocal}
          className="flex items-center gap-3 w-full p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/[0.02] transition-all group active:scale-[0.98]"
        >
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center group-hover:border-indigo-500/20 group-hover:bg-indigo-500/5 transition-all">
            <HardDrive className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400" />
          </div>
          <div className="text-left">
            <div className="text-[11px] font-bold text-white uppercase tracking-wider">Local Storage</div>
            <div className="text-[10px] text-zinc-500 italic lowercase">Save to browser's indexedDB</div>
          </div>
        </button>

        <button 
          onClick={onSaveCloud}
          className="flex items-center gap-3 w-full p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 hover:border-indigo-500/30 hover:bg-indigo-500/10 transition-all group active:scale-[0.98]"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Cloud className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-left">
            <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Cloud Storage</div>
            <div className="text-[10px] text-indigo-400/50 italic lowercase">Sync to your WebLens account</div>
          </div>
        </button>
      </div>
    </BaseDialog>
  );
};
