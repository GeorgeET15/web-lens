import React from 'react';
import { History, AlertTriangle } from 'lucide-react';
import { BaseDialog } from './BaseDialog';

interface ClearHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ClearHistoryDialog: React.FC<ClearHistoryDialogProps> = ({ isOpen, onClose, onConfirm }) => {
  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Clear Execution History"
      description="DANGER: This will permanently delete ALL execution history, including screenshots and logs. This action CANNOT be undone."
      icon={History}
      confirmLabel="Clear All History"
      isDestructive={true}
    >
      <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-rose-200/60 leading-relaxed uppercase tracking-wider font-bold">
          High-Risk Action Detected: All stored execution artifacts will be scrubbed from the system.
        </p>
      </div>
    </BaseDialog>
  );
};
