import React from 'react';
import { Trash2 } from 'lucide-react';
import { BaseDialog } from './BaseDialog';

interface DeleteFlowDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  flowName?: string;
}

export const DeleteFlowDialog: React.FC<DeleteFlowDialogProps> = ({ isOpen, onClose, onConfirm, flowName }) => {
  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Flow"
      description={flowName ? `Are you sure you want to delete the flow "${flowName}"? This action cannot be undone.` : "Are you sure you want to delete this flow? This action cannot be undone."}
      icon={Trash2}
      confirmLabel="Delete Flow"
      isDestructive={true}
    />
  );
};
