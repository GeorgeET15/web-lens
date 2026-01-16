import React from 'react';
import { MessageSquareX } from 'lucide-react';
import { BaseDialog } from './BaseDialog';

interface ClearChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ClearChatDialog: React.FC<ClearChatDialogProps> = ({ isOpen, onClose, onConfirm }) => {
  return (
    <BaseDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Clear Chat History"
      description="Are you sure you want to clear the AI chat history? This action cannot be undone and you will lose context for the current session."
      icon={MessageSquareX}
      confirmLabel="Clear History"
      isDestructive={true}
    />
  );
};
