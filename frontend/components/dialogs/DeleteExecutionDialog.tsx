import React from 'react';
import { Trash2 } from 'lucide-react';
import { BaseDialog } from './BaseDialog';

interface DeleteExecutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteExecutionDialog: React.FC<DeleteExecutionDialogProps> = ({ isOpen, onClose, onConfirm }) => {
  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Execution Trace"
      description="Are you sure you want to delete this execution trace? This will permanently remove the logs and screenshots associated with this run."
      icon={Trash2}
      confirmLabel="Delete Trace"
      isDestructive={true}
    />
  );
};
