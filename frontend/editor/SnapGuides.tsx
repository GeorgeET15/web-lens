import { EditorBlock } from './entities';
import { cn } from '../lib/utils';
import { LAYOUT_CONSTANTS } from './FlowEditor';

interface SnapGuidesProps {
  activeSnapTarget: { id: string; type: 'bottom' | 'then' | 'else' | 'body' } | null;
  blocks: EditorBlock[];
  effectivePositions?: Record<string, { x: number, y: number }>;
}

export const SnapGuides: React.FC<SnapGuidesProps> = ({ 
  activeSnapTarget, 
  blocks,
  effectivePositions = {}
}) => {
  if (!activeSnapTarget) return null;

  const targetBlock = blocks.find(b => b.id === activeSnapTarget.id);
  if (!targetBlock) return null;
  const targetPos = effectivePositions[targetBlock.id] || targetBlock.position;
  if (!targetPos) return null;

  // Calculate phantom position based on target type
  let phantomX = targetPos.x;
  let phantomY = targetPos.y + LAYOUT_CONSTANTS.BLOCK_HEIGHT + LAYOUT_CONSTANTS.VERTICAL_GAP;
  let label = "SNAP TO FLOW";
  let color = "bg-indigo-500/10";
  let borderColor = "border-indigo-500/30";

  if (activeSnapTarget.type === 'then') {
      phantomX += LAYOUT_CONSTANTS.BRANCH_X_OFFSET;
      phantomY = targetPos.y + LAYOUT_CONSTANTS.BLOCK_HEIGHT;
      label = "SNAP TO THEN";
      color = "bg-emerald-500/5";
      borderColor = "border-emerald-500/20";
  } else if (activeSnapTarget.type === 'else') {
      phantomX += LAYOUT_CONSTANTS.BRANCH_X_OFFSET;
      phantomY = targetPos.y + LAYOUT_CONSTANTS.BLOCK_HEIGHT + 60; 
      label = "SNAP TO ELSE";
      color = "bg-rose-500/5";
      borderColor = "border-rose-500/20";
  } else if (activeSnapTarget.type === 'body') {
      phantomX += LAYOUT_CONSTANTS.BRANCH_X_OFFSET;
      phantomY = targetPos.y + LAYOUT_CONSTANTS.BLOCK_HEIGHT;
      label = "SNAP TO BODY";
      color = "bg-zinc-500/5";
      borderColor = "border-zinc-500/20 font-bold italic opacity-60";
  }

  return (
    <div 
      className="pointer-events-none absolute inset-0 overflow-visible"
      style={{ zIndex: 45 }}
    >
      {/* Magnetic Field Glow */}
      <div 
        className="absolute rounded-full bg-indigo-500/5 blur-[100px] transition-all duration-500 select-none animate-pulse"
        style={{
          left: targetPos.x - 150,
          top: targetPos.y - 150,
          width: 600,
          height: 600,
          transformOrigin: 'center center'
        }}
      />

      {/* Phantom Block Preview - The "Shadow" */}
      <div 
        className={cn(
            "absolute rounded-2xl border border-dashed backdrop-blur-[2px] transition-all duration-300 shadow-[0_10px_40px_rgba(0,0,0,0.5)]",
            color, borderColor
        )}
        style={{
          left: phantomX,
          top: phantomY,
          width: LAYOUT_CONSTANTS.BLOCK_WIDTH,
          height: LAYOUT_CONSTANTS.BLOCK_HEIGHT,
          transformOrigin: '0 0'
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-1">
                <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">
                    {label}
                </div>
            </div>
        </div>

        {/* Glossy overlay for phantom */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl" />
      </div>
    </div>
  );
};
