import React from 'react';
import { Trash2, Cloud, HardDrive } from 'lucide-react';
import { BaseDialog } from './BaseDialog';

interface AdvancedDeleteFlowDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteEverywhere: () => void;
  onDeleteCloud?: () => void;
  onDeleteLocal?: () => void;
  flowName: string;
  hasCloud: boolean;
  hasLocal: boolean;
}

export const AdvancedDeleteFlowDialog: React.FC<AdvancedDeleteFlowDialogProps> = ({ 
  isOpen, 
  onClose, 
  onDeleteEverywhere,
  onDeleteCloud,
  onDeleteLocal,
  flowName,
  hasCloud,
  hasLocal
}) => {
  const showMulti = hasCloud && hasLocal;

  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onDeleteEverywhere}
      title="Delete Flow"
      description={`Are you sure you want to delete "${flowName}"? This action cannot be undone.`}
      icon={Trash2}
      confirmLabel={showMulti ? "Delete Everywhere" : "Delete Flow"}
      isDestructive={true}
    >
      {showMulti && (
        <div className="grid grid-cols-1 gap-2 mt-4">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Partial Deletion Options</p>
          
          {onDeleteLocal && (
            <button 
              onClick={onDeleteLocal}
              className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-rose-500/30 hover:bg-rose-500/[0.02] transition-all group active:scale-[0.98]"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center group-hover:border-rose-500/20 group-hover:bg-rose-500/5 transition-all">
                <HardDrive className="w-4 h-4 text-zinc-500 group-hover:text-rose-400" />
              </div>
              <div className="text-left">
                <div className="text-[10px] font-bold text-white uppercase tracking-wider">Delete Locally Only</div>
                <div className="text-[9px] text-zinc-600 italic">Keep cloud version active</div>
              </div>
            </button>
          )}

          {onDeleteCloud && (
            <button 
              onClick={onDeleteCloud}
              className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-rose-500/30 hover:bg-rose-500/[0.02] transition-all group active:scale-[0.98]"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center group-hover:border-rose-500/20 group-hover:bg-rose-500/5 transition-all">
                <Cloud className="w-4 h-4 text-zinc-500 group-hover:text-rose-400" />
              </div>
              <div className="text-left">
                <div className="text-[10px] font-bold text-white uppercase tracking-wider">Remove from Cloud</div>
                <div className="text-[9px] text-zinc-600 italic">Keep local cached version</div>
              </div>
            </button>
          )}
        </div>
      )}
    </BaseDialog>
  );
};
