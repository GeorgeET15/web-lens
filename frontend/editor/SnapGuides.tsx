import React from 'react';
import { EditorBlock } from './entities';

interface SnapGuidesProps {
  activeSnapTarget: { id: string; type: 'bottom' | 'then' | 'else' | 'body' } | null;
  blocks: EditorBlock[];
  effectivePositions?: Record<string, { x: number, y: number }>;
}

export const SnapGuides: React.FC<SnapGuidesProps> = () => {
  // Phantom block preview has been removed as per user request.
  // Visual feedback is now handled via direct block highlighting in BaseBlock.tsx.
  return null;
};
