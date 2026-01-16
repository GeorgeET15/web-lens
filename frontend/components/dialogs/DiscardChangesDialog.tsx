import React from 'react';
import { FileWarning } from 'lucide-react';
import { BaseDialog } from './BaseDialog';

interface DiscardChangesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DiscardChangesDialog: React.FC<DiscardChangesDialogProps> = ({ isOpen, onClose, onConfirm }) => {
  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Discard Changes"
      description="You have unsaved changes on your current canvas. Loading a new flow will discard these changes forever. Proceed?"
      icon={FileWarning}
      confirmLabel="Discard & Load"
      isDestructive={true}
    />
  );
};
