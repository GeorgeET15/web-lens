import React from 'react';
import { Eraser } from 'lucide-react';
import { BaseDialog } from './BaseDialog';

interface ClearCanvasDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ClearCanvasDialog: React.FC<ClearCanvasDialogProps> = ({ isOpen, onClose, onConfirm }) => {
  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Clear Canvas"
      description="This will remove all blocks from your current flow. You'll start with a clean slate."
      icon={Eraser}
      confirmLabel="Clear Canvas"
      isDestructive={true}
    />
  );
};
