
import { useState, useMemo, useImperativeHandle, forwardRef, useEffect, memo, useRef } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';

import type { FlowGraph } from '../types/flow';
import { BaseBlock, BaseBlockOverlay } from './blocks/BaseBlock';
import { Plus, Minus, Save, FolderOpen, Trash2, X, LocateFixed, Globe, Laptop, Wand2 } from 'lucide-react';
import { FlowStorage, SavedFlowMetadata } from '../lib/storage';
import { OnboardingModal } from '../components/OnboardingModal';
import { supabase } from '../lib/supabase';
import { Minimap } from './Minimap';
import { SnapGuides } from './SnapGuides';
import { FlowTransformer } from '../lib/flow-transformer';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { ScenarioPanel } from '../components/ScenarioPanel';
import { EditorBlock, BlockType, SavedValue, ScenarioSuiteReport } from './entities';
import { ScenarioSuiteDashboard } from '../components/execution/ScenarioSuiteDashboard';
import { GeniePrompt } from '../components/ai/GeniePrompt';

import { cn } from '../lib/utils';
import { Skeleton } from '../components/Skeleton';
import { DEFAULT_BLOCKS } from './constants';

export interface FlowEditorRef {
  highlightBlockActive: (blockId: string, message?: string) => void;
  highlightBlockSuccess: (blockId: string, message?: string) => void;
  highlightBlockFailed: (blockId: string, message?: string) => void;
  clearHighlighting: () => void;
  scrollToBlock: (blockId: string) => void;
  createNewFlow: () => void;
  loadFlow: (flow: FlowGraph) => void;
  exportFlow: () => void;
  triggerImport: () => void;
}

export const LAYOUT_CONSTANTS = {
    BLOCK_WIDTH: 320,
    BLOCK_HEIGHT: 130, // Standardized 
    VERTICAL_GAP: 20,
    BRANCH_X_OFFSET: 40,
    EMPTY_BRANCH_HEIGHT: 50,
    GRID_SIZE: 20
};

function getRelativeTime(dateString: string | number | Date): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
}

import { ExecutionReport } from '../types/execution';

import { Environment } from '../types/environment';

interface FlowEditorProps {
  onFlowChange?: (flow: FlowGraph | null) => void;
  onValidationError?: (errors: string[]) => void;
  onRequestPick?: (blockType: string, callback: (element: any) => void) => void;
  highlightBlockId?: string | null;
  onBlockClick?: (id: string) => void;
  showOnboarding?: boolean;
  setShowOnboarding?: (show: boolean) => void;
  onViewScenario?: (runId: string) => void;
  lastReport?: ExecutionReport | null;
  externalVariables?: { key: string, label: string }[];
  environments?: Environment[];
  selectedEnvironmentId?: string;
}


// Helper to separate render logic
const RenderBlockList = memo(({ 
  blocks, 
  parentId, 
  branchKey,
  blockStatuses,
  blockMessages,
  contextUrl,
  globalVariables,
  deleteBlock,
  duplicateBlock,
  updateBlock,
  onAddBlock,
  onRequestPick,
  onMoveToBranch,
  highlightBlockId,
  onBlockClick,
  activeSnapTarget,
  savedValues,
  activeFlowIds = new Set<string>(),
  selectionExists = false
}: any) => {
  const levelBlocks = useMemo(() => {
    const filtered = blocks.filter((b: any) => b.parentId === parentId && b.branchKey === branchKey);
    return filtered;
  }, [blocks, parentId, branchKey]);

  // Callback for BaseBlock to render its nested lists
  // This avoids passing mixed children arrays and allows BaseBlock to own the structural logic
  const renderBlockListCallback = ({ parentId, branchKey }: { parentId: string, branchKey?: string }) => (
      <RenderBlockList 
        blocks={blocks}
        parentId={parentId}
        branchKey={branchKey}
        blockStatuses={blockStatuses}
        blockMessages={blockMessages}
        contextUrl={contextUrl}
        globalVariables={globalVariables}
        deleteBlock={deleteBlock}
        duplicateBlock={duplicateBlock}
        updateBlock={updateBlock}
        onAddBlock={onAddBlock}
        onRequestPick={onRequestPick}
        onMoveToBranch={onMoveToBranch}
        highlightBlockId={highlightBlockId}
        onBlockClick={onBlockClick}
        activeSnapTarget={activeSnapTarget}
        activeFlowIds={activeFlowIds}
        selectionExists={selectionExists}
        savedValues={savedValues}
      />
  );

  
  if (!parentId) {
      // Root Level - High Contrast Spatial Rendering
      return (
          <SortableContext items={levelBlocks.map((b: any) => b.id)} strategy={rectSortingStrategy}>
            {levelBlocks.map((block: any, index: number) => {
                const effectivePos = block.position || { x: 100, y: 100 + (index * 125) };
                
                return (
                  <BaseBlock
                    key={block.id}
                    id={block.id}
                    block={{ ...block, position: effectivePos }}
                    status={blockStatuses[block.id] || 'idle'}
                    message={blockMessages[block.id]}
                    onDelete={deleteBlock}
                    onDuplicate={duplicateBlock}
                    onUpdate={updateBlock}
                    onAddBlock={onAddBlock}
                    onRequestPick={onRequestPick}
                    branchKey={branchKey}
                    onMoveToBranch={onMoveToBranch}
                    isActive={highlightBlockId === block.id}
                    isHighlighted={activeFlowIds.has(block.id)}
                    isSnapped={activeSnapTarget?.id === block.id}
                    snapType={activeSnapTarget?.id === block.id ? activeSnapTarget.type : undefined}
                    selectionExists={selectionExists}
                    onClick={() => onBlockClick?.(block.id)}
                    availableBranches={blocks
                        .filter((b: any) => (b.type === 'if_condition' || b.type === 'repeat_until') && b.id !== block.id)
                        .map((b: any) => ({ id: b.id, label: b.label, type: b.type }))
                    }
                    savedValues={savedValues}
                    blocks={blocks}
                    renderBlockList={renderBlockListCallback}
                  />
                );
            })}
          </SortableContext>
      );
  }

  return (
    <SortableContext items={levelBlocks.map((b: any) => b.id)} strategy={verticalListSortingStrategy}>
      <div className="space-y-0">
        {levelBlocks.map((block: any) => (
          <BaseBlock
            key={block.id}
            id={block.id}
            block={block}
            status={blockStatuses[block.id] || 'idle'}
            message={blockMessages[block.id]}
            onDelete={deleteBlock}
            onDuplicate={duplicateBlock}
            onUpdate={updateBlock}
            onAddBlock={onAddBlock}
            onRequestPick={onRequestPick}
            branchKey={branchKey}
            onMoveToBranch={onMoveToBranch}
            isActive={highlightBlockId === block.id}
            isHighlighted={activeFlowIds.has(block.id)}
            isSnapped={activeSnapTarget?.id === block.id}
            snapType={activeSnapTarget?.id === block.id ? activeSnapTarget.type : undefined}
            selectionExists={selectionExists}
            onClick={() => onBlockClick?.(block.id)}
            availableBranches={blocks
                .filter((b: any) => (b.type === 'if_condition' || b.type === 'repeat_until') && b.id !== block.id)
                .map((b: any) => ({ id: b.id, label: b.label, type: b.type }))
            }
            savedValues={savedValues}
            blocks={blocks}
            renderBlockList={renderBlockListCallback}
          />
        ))}
      </div>
    </SortableContext>
  );
});
;

export const FlowEditor = forwardRef<FlowEditorRef, FlowEditorProps>(
  ({ onFlowChange, onValidationError, onRequestPick, highlightBlockId, onBlockClick,
    showOnboarding,
    setShowOnboarding,
    onViewScenario,
    externalVariables = [],
    environments = [],
    selectedEnvironmentId = ''
  }, ref) => {
    // State for blocks
    const [blocks, setBlocks] = useState<EditorBlock[]>([]);
    const [flowName, setFlowName] = useState('My Test Flow');
    const [flowDescription, setFlowDescription] = useState<string>('');
    const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
    const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
    const [isSidebarOpen] = useState(true); 
    const [globalVariables, setGlobalVariables] = useState<{ id: string, key: string, value: string }[]>([]);
    const [scenarioSets, setScenarioSets] = useState<any[]>([]);
    const [suiteReport, setSuiteReport] = useState<ScenarioSuiteReport | null>(null);
    const [schemaVersion, setSchemaVersion] = useState(1);
    
    // AI Roles State

    const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
    const [savedFlows, setSavedFlows] = useState<SavedFlowMetadata[]>([]);
    const [isLoadingSavedFlows, setIsLoadingSavedFlows] = useState(false);

    const [isProcessing, setIsProcessing] = useState(false);
    const [processingMessage, setProcessingMessage] = useState('Processing...');
    
    // Genie AI Side Panel
    const [isGenieOpen, setIsGenieOpen] = useState(false);

    // Block search
    const [blockSearchQuery, setBlockSearchQuery] = useState('');

const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    secondaryLabel?: string;
    tertiaryLabel?: string;
    onConfirm: () => void;
    onSecondary?: () => void;
    onTertiary?: () => void;
    isDestructive?: boolean;
    showCancel?: boolean;
}>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
});

    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [blockStatuses, setBlockStatuses] = useState<Record<string, 'idle' | 'running' | 'success' | 'failed'>>({});
    const [blockMessages, setBlockMessages] = useState<Record<string, string>>({});
    const [isPanning, setIsPanning] = useState(false);
    const [activeSnapTarget, setActiveSnapTarget] = useState<{ id: string, type: 'bottom' | 'then' | 'else' | 'body' } | null>(null);
    const snapTargetRef = useRef<{ id: string, type: 'bottom' | 'then' | 'else' | 'body' } | null>(null);

    // dnd-kit sensors - Higher distance threshold for intentional start, avoiding accidental jitters
    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 2, // Even more "liquid" start
        },
      }),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      })
    );

    // Initial blocks
    useEffect(() => {
        if (blocks.length === 0) {
            const initialBlocks: EditorBlock[] = [
                { id: 'block_1', ...DEFAULT_BLOCKS.open_page, position: { x: 100, y: 100 } }
            ];
            setBlocks(initialBlocks);
        }
    }, [])

    // Expose highlighting methods
    const [sidebarWidth, setSidebarWidth] = useState(() => {
      const saved = localStorage.getItem('flow-sidebar-width');
      return saved ? parseInt(saved, 10) : 256;
    });
    const [isResizingSidebar, setIsResizingSidebar] = useState(false);

    // Calculate active variables for AI context
    const activeVariables = useMemo(() => {
        const vars: Record<string, string> = {};
        
        // 1. Environment Variables (lowest precedence)
        const selectedEnv = environments.find(e => e.id === selectedEnvironmentId);
        if (selectedEnv?.variables) {
            Object.assign(vars, selectedEnv.variables);
        }
        
        // 2. Global Variables (flow-level)
        globalVariables.forEach(gv => {
            if (gv.key) vars[gv.key] = gv.value;
        });

        // 3. External Variables (labels/keys from props)
        externalVariables.forEach(ev => {
            if (ev.key) vars[ev.key] = `{{EXTERNAL:${ev.key}}}`;
        });

        return vars;
    }, [environments, selectedEnvironmentId, globalVariables, externalVariables]);

    useEffect(() => {
      const flow = FlowTransformer.toCanonical(flowName, blocks, globalVariables, scenarioSets, schemaVersion);
      
      onFlowChange?.(flow);
      onValidationError?.([]); 
    }, [blocks, flowName, globalVariables, schemaVersion]);

    const normalizedSavedValues: SavedValue[] = useMemo(() => {
        const globalVars = globalVariables.map(v => ({ key: v.key, label: v.key || 'Untitled' }));
        const envVars = externalVariables.map(v => ({ key: v.key, label: v.key || 'Environment' }));
        const blockVars = blocks
            .filter(b => (b.type === 'save_text' || b.type === 'save_page_content') && b.params.save_as?.key)
            .map(b => ({ key: b.params.save_as.key, label: b.params.save_as.label || b.params.save_as.key }));
        return [...globalVars, ...envVars, ...blockVars].filter(v => v.key && v.key.trim() !== '');
    }, [globalVariables, blocks, externalVariables]);

    const byParent = useMemo(() => {
        const map = new Map<string, EditorBlock[]>();
        blocks.forEach(b => {
            const key = `${b.parentId || 'root'}:${b.branchKey || 'main'}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(b);
        });
        return map;
    }, [blocks]);

    const effectivePositions = useMemo(() => {
        const positions: Record<string, { x: number, y: number }> = {};
        
        const processChain = (parentId: string | undefined, branchKey: string | undefined, startX: number, startY: number): number => {
            const key = `${parentId || 'root'}:${branchKey || 'main'}`;
            const chain = byParent.get(key) || [];
            let currentY = startY;
            let totalHeight = 0;
            
            chain.forEach((block) => {
                positions[block.id] = { x: startX, y: currentY };
                const totalBlockSpace = LAYOUT_CONSTANTS.BLOCK_HEIGHT + LAYOUT_CONSTANTS.VERTICAL_GAP;
                
                // Process branches (which are nested)
                let branchPadding = 0;
                if (block.type === 'if_condition') {
                    const thenHeight = processChain(block.id, 'then', startX + LAYOUT_CONSTANTS.BRANCH_X_OFFSET, currentY + LAYOUT_CONSTANTS.BLOCK_HEIGHT);
                    const thenSpace = Math.max(thenHeight, LAYOUT_CONSTANTS.EMPTY_BRANCH_HEIGHT);
                    
                    const elseHeight = processChain(block.id, 'else', startX + LAYOUT_CONSTANTS.BRANCH_X_OFFSET, currentY + LAYOUT_CONSTANTS.BLOCK_HEIGHT + thenSpace);
                    const elseSpace = Math.max(elseHeight, LAYOUT_CONSTANTS.EMPTY_BRANCH_HEIGHT);
                    
                    branchPadding = thenSpace + elseSpace;
                } else if (block.type === 'repeat_until') {
                    const bodyHeight = processChain(block.id, 'body', startX + LAYOUT_CONSTANTS.BRANCH_X_OFFSET, currentY + LAYOUT_CONSTANTS.BLOCK_HEIGHT);
                    branchPadding = Math.max(bodyHeight, LAYOUT_CONSTANTS.EMPTY_BRANCH_HEIGHT);
                }
                
                currentY += totalBlockSpace + branchPadding;
                totalHeight += totalBlockSpace + branchPadding;
            });
            return totalHeight;
        };

        blocks.filter(b => !b.parentId).forEach(root => {
            const pos = root.position || { x: 100, y: 100 };
            positions[root.id] = pos;
            processChain(root.id, undefined, pos.x, pos.y + LAYOUT_CONSTANTS.BLOCK_HEIGHT + LAYOUT_CONSTANTS.VERTICAL_GAP);
        });

        return positions;
    }, [blocks, byParent]);


    useImperativeHandle(ref, () => ({
        highlightBlockActive: (id, message) => {
            setBlockStatuses(prev => ({ ...prev, [id]: 'running' }));
            if (message) setBlockMessages(prev => ({ ...prev, [id]: message }));
        },
        highlightBlockSuccess: (id, message) => {
            setBlockStatuses(prev => ({ ...prev, [id]: 'success' }));
            if (message) setBlockMessages(prev => ({ ...prev, [id]: message }));
        },
        highlightBlockFailed: (id, message) => {
            setBlockStatuses(prev => ({ ...prev, [id]: 'failed' }));
            if (message) setBlockMessages(prev => ({ ...prev, [id]: message }));
        },
        clearHighlighting: () => {
            setBlockStatuses({});
            setBlockMessages({});
        },
        scrollToBlock: (id) => {
            const pos = effectivePositions[id];
            if (pos) {
                const containerWidth = window.innerWidth - (isSidebarOpen ? sidebarWidth : 0);
                const containerHeight = window.innerHeight - 56; 
                
                // Focus the block in the center of the available canvas area
                setView(prev => ({
                    ...prev,
                    x: (containerWidth / 2) - (pos.x * prev.scale + (LAYOUT_CONSTANTS.BLOCK_WIDTH / 2) * prev.scale),
                    y: (containerHeight / 2) - (pos.y * prev.scale + (LAYOUT_CONSTANTS.BLOCK_HEIGHT / 2) * prev.scale)
                }));
            }
        },
        createNewFlow: () => {
            resetToNewFlow();
        },
        loadFlow: (flow) => {
            const state = FlowTransformer.toEditorState(flow);
            setBlocks(state.blocks);
            setFlowName(state.name);
            setFlowDescription(state.description || '');
            setGlobalVariables(state.variables);
            setScenarioSets(state.scenarioSets);
            setSchemaVersion(state.schemaVersion);
            setCurrentFlowId(flow.id || null);
            setIsLoadModalOpen(false);
            if (flow.id) {
                FlowStorage.trackUsage(flow.id);
                // Also track on cloud if it's a cloud flow
                const isCloud = savedFlows.find(f => f.id === flow.id)?.sources?.includes('cloud');
                if (isCloud) {
                    FlowStorage.trackUsageCloud(flow.id);
                }
            }
            resetView();
        },
        exportFlow: () => {
            handleExport();
        },
        triggerImport: () => {
            document.getElementById('import-file-input')?.click();
        }
    }));






    // Resizing Logic
    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (!isResizingSidebar) return;
        const newWidth = e.clientX;
        const minWidth = 200;
        const maxWidth = 500;
        if (newWidth >= minWidth && newWidth <= maxWidth) {
          setSidebarWidth(newWidth);
          localStorage.setItem('flow-sidebar-width', newWidth.toString());
        }
      };

      const handleMouseUp = () => {
        setIsResizingSidebar(false);
      };

      if (isResizingSidebar) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      } else {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isResizingSidebar]);

    // Handlers
    function handleDragStart(event: DragStartEvent) {
      setActiveDragId(event.active.id as string);
    }

    function handleDragMove(event: DragMoveEvent) {
        const { active, collisions } = event;
        const activeBlock = blocks.find(b => b.id === active.id);
        if (!activeBlock) return;

        // Skip snap logic if block is already part of the flow structure (repositioning, not adding from palette)
        // A block is part of the flow if it:
        // 1. Has no position (nested blocks rely on auto-layout), OR
        // 2. Has children (other blocks reference it as parent)
        const hasChildren = blocks.some(b => b.parentId === activeBlock.id);
        const isPartOfFlow = activeBlock.position === undefined || hasChildren;
        
        if (isPartOfFlow) {
            // Clear any existing snap target
            if (snapTargetRef.current) {
                snapTargetRef.current = null;
                setActiveSnapTarget(null);
            }
            return;
        }

        let nearestTarget: { id: string, type: 'bottom' | 'then' | 'else' | 'body' } | null = null;
        
        // 1. Check Collisions (Direct Hover)
        if (collisions && collisions.length > 0) {
            const firstCollision = collisions[0];
            const targetId = firstCollision.id as string;
            const targetBlock = blocks.find(b => b.id === targetId);

            if (targetBlock && targetId !== active.id) {
                nearestTarget = { id: targetId, type: 'bottom' };
            }
        }


        if (nearestTarget?.id !== snapTargetRef.current?.id || nearestTarget?.type !== snapTargetRef.current?.type) {
            snapTargetRef.current = nearestTarget;
            setActiveSnapTarget(nearestTarget);
        }
    }

    function handleDragEnd(event: DragEndEvent) {
      const { active, delta } = event;
      
      setBlocks((prev) => {
          const activeBlock = prev.find(b => b.id === active.id);
          if (!activeBlock) return prev;

          // 1. Snapping to a target
          if (activeSnapTarget) {
              const targetId = activeSnapTarget.id;
              const target = prev.find(b => b.id === targetId);
              if (!target) return prev;

              const isSequential = activeSnapTarget.type === 'bottom';
              
              let newParentId: string | undefined;
              let newBranchKey: 'then' | 'else' | 'body' | undefined;

              if (isSequential) {
                  // If target is root, we become its first child. 
                  // If target has a parent, we become a sibling (same parent/branch).
                  newParentId = target.parentId ? target.parentId : target.id;
                  newBranchKey = target.parentId ? target.branchKey : undefined;
              } else {
                  // Inside a branch
                  newParentId = target.id;
                  newBranchKey = activeSnapTarget.type as any;
              }

              const activeIdx = prev.findIndex(b => b.id === active.id);
              let newBlocks = [...prev];
              const blockToMove = { 
                  ...newBlocks[activeIdx], 
                  parentId: newParentId, 
                  branchKey: newBranchKey, 
                  position: undefined 
              };

              // Remove from old position and insert after target for stable sequence
              newBlocks.splice(activeIdx, 1);
              const targetIdx = newBlocks.findIndex(b => b.id === targetId);
              newBlocks.splice(targetIdx + 1, 0, blockToMove);

              return newBlocks;
          }

          // 2. Handle root-level swapping for "app icon" style rearranging
          if (!activeSnapTarget && event.over && active.id !== event.over.id) {
            const over = event.over;
            const activeIdx = prev.findIndex(b => b.id === active.id);
            const overIdx = prev.findIndex(b => b.id === over.id);
            
            if (activeIdx !== -1 && overIdx !== -1) {
                const activeB = prev[activeIdx];
                const overB = prev[overIdx];
                
                if (!activeB.parentId && !overB.parentId) {
                    // We swap positions and also reorder in the array so SortableContext is happy
                    const aPos = activeB.position || effectivePositions[activeB.id];
                    const oPos = overB.position || effectivePositions[overB.id];
                    
                    if (aPos && oPos) {
                        const newBlocks = arrayMove(prev, activeIdx, overIdx);
                        // After move, the indices changed, find them again
                        const newActiveIdx = newBlocks.findIndex(b => b.id === active.id);
                        const newOverIdx = newBlocks.findIndex(b => b.id === over.id);
                        
                        newBlocks[newActiveIdx] = { ...activeB, position: oPos };
                        newBlocks[newOverIdx] = { ...overB, position: aPos };
                        return newBlocks;
                    }
                }
            }
          }

          // Fallback to spatial movement (Detaching from chain if necessary)
          return prev.map(b => {
              if (b.id === active.id) {
                  const startPos = b.position || effectivePositions[b.id];
                  if (!startPos) return b;

                  const currentX = startPos.x + delta.x / view.scale;
                  const currentY = startPos.y + delta.y / view.scale;

                  return {
                      ...b,
                      parentId: undefined, // Fully detach if moving spatially
                      branchKey: undefined,
                      position: { 
                        x: Math.round(currentX / LAYOUT_CONSTANTS.GRID_SIZE) * LAYOUT_CONSTANTS.GRID_SIZE, 
                        y: Math.round(currentY / LAYOUT_CONSTANTS.GRID_SIZE) * LAYOUT_CONSTANTS.GRID_SIZE 
                      }
                  };
              }
              return b;
          });
      });

      setActiveDragId(null);
      setActiveSnapTarget(null);
      snapTargetRef.current = null;
    }

    const resetView = () => {
        setView({ x: 0, y: 0, scale: 1 });
    };

    const getCanvasCenter = () => {
        // Calculate the center of the visible area relative to the current view
        const actualWidth = window.innerWidth - (isSidebarOpen ? sidebarWidth : 0);
        const actualHeight = window.innerHeight - 56;
        
        const centerX = (actualWidth / 2 - view.x) / view.scale;
        const centerY = (actualHeight / 2 - view.y) / view.scale;
        
        // Add a small random jitter to avoid perfect overlap when spawning multiple blocks
        const jitterX = (Math.random() - 0.5) * 60;
        const jitterY = (Math.random() - 0.5) * 60;
        
        return { 
            x: centerX - (LAYOUT_CONSTANTS.BLOCK_WIDTH / 2) + jitterX, 
            y: Math.max(80, centerY - (LAYOUT_CONSTANTS.BLOCK_HEIGHT / 2) + jitterY) 
        };
    };

    function addBlock(type: BlockType, parentId?: string, branchKey?: 'then' | 'else' | 'body', position?: { x: number, y: number }) {
        const newBlock: EditorBlock = {
            id: `block_${crypto.randomUUID()}`,
            ...DEFAULT_BLOCKS[type],
            parentId,
            branchKey,
            position: position || (parentId ? undefined : getCanvasCenter())
        };
        setBlocks(prev => [...prev, newBlock]);
    }

    function updateBlock(id: string, updates: Partial<EditorBlock>) {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    }

    function deleteBlock(id: string) {
        setBlocks(prev => {
            const toDelete = new Set<string>();

            const collect = (blockId: string) => {
                toDelete.add(blockId);
                prev.filter(b => b.parentId === blockId).forEach(b => collect(b.id));
            };

            collect(id);
            return prev.filter(b => !toDelete.has(b.id));
        });
    }

    function duplicateBlock(id: string) {
        setBlocks(prev => {
            const sourceIdx = prev.findIndex(b => b.id === id);
            if (sourceIdx === -1) return prev;

            const clones: EditorBlock[] = [];

            const cloneRec = (block: EditorBlock, parentId?: string) => {
                const newId = `block_${crypto.randomUUID()}`;
                
                const copy: EditorBlock = {
                    ...block,
                    id: newId,
                    parentId,
                    position: block.position
                        ? { x: block.position.x + 40, y: block.position.y + 40 }
                        : undefined
                };
                clones.push(copy);

                prev
                    .filter(b => b.parentId === block.id)
                    .forEach(child => cloneRec(child, newId));
            };

            const rootBlock = prev[sourceIdx];
            cloneRec(rootBlock, rootBlock.parentId);

            // Splice the clones into the array right after the original source structure
            const next = [...prev];
            next.splice(sourceIdx + 1, 0, ...clones);
            return next;
        });
    }

    function handleMoveToBranch(blockId: string, parentId?: string, branchKey?: 'then' | 'else' | 'body') {
        setBlocks(prev => {
            // Cycle Check
            if (parentId) {
                let current = prev.find(b => b.id === parentId);
                while (current) {
                    if (current.id === blockId) {
                        if ((window as any).addToast) (window as any).addToast('error', 'Cannot move block into its own descendant');
                        return prev; 
                    }
                    current = prev.find(b => b.id === current?.parentId);
                }
            }

            return prev.map(b => b.id === blockId ? { ...b, parentId, branchKey } : b);
        });
    }
    
    // --- Persistence Handlers ---

    const handleSave = async () => {
        const session = await supabase.auth.getSession();
        
        if (session.data.session) {
            setDialogConfig({
                isOpen: true,
                title: 'Save Flow',
                message: 'Where would you like to save this flow?',
                confirmLabel: 'Cloud Storage',
                secondaryLabel: 'Local Storage',
                cancelLabel: 'Cancel',
                onConfirm: () => {
                    performSave('cloud');
                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                },
                onSecondary: () => {
                    performSave('local');
                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                }
            });
        } else {
            performSave('local');
        }
    };

    const performSave = async (location: 'local' | 'cloud') => {
        setIsProcessing(true);
        setProcessingMessage(location === 'cloud' ? 'Uploading to Cloud...' : 'Saving Locally...');
        try {
            const flow = FlowTransformer.toCanonical(flowName, blocks, globalVariables, scenarioSets, 1, currentFlowId || undefined, flowDescription);
            
            if (location === 'cloud') {
                const cloudRes = await FlowStorage.saveCloud(flow);
                if (cloudRes) {
                    setCurrentFlowId(cloudRes.id);
                    if ((window as any).addToast) (window as any).addToast('success', 'Flow saved to cloud');
                }
            } else {
                const saved = FlowStorage.save(flow, currentFlowId || undefined);
                setCurrentFlowId(saved.id);
                if ((window as any).addToast) (window as any).addToast('success', 'Flow saved locally');
            }
        } catch (e) {
            console.error(e);
            if ((window as any).addToast) {
                (window as any).addToast('error', `Failed to save flow to ${location}`);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleOpenLoadModal = async () => {
        setIsLoadModalOpen(true);
        setIsLoadingSavedFlows(true);
        
        try {
            const local = FlowStorage.list();
            const cloud = await FlowStorage.listCloud();
            
            // Deduplicate and Merge
            const mergedMap = new Map<string, any>();
            
            cloud.forEach(f => {
                mergedMap.set(f.id, { 
                    ...f, 
                    sources: ['cloud'],
                    primarySource: 'cloud'
                });
            });
            
            local.forEach(f => {
                if (mergedMap.has(f.id)) {
                    const existing = mergedMap.get(f.id);
                    existing.sources.push('local');
                } else {
                    mergedMap.set(f.id, { 
                        ...f, 
                        sources: ['local'],
                        primarySource: 'local'
                    });
                }
            });
            
            
            const sortedFlows = Array.from(mergedMap.values()).sort((a: any, b: any) => {
                const usedA = a.lastUsedAt || 0;
                const usedB = b.lastUsedAt || 0;
                
                // 1. Primary Sort: Usage Time (Recency of Load)
                if (usedA !== usedB) return usedB - usedA;
                
                // 2. Secondary Sort: Update Time (for never-loaded items)
                return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            });
            
            setSavedFlows(sortedFlows);
        } finally {
            setIsLoadingSavedFlows(false);
        }
    };

    const handleLoadFlow = async (id: string, isTemplate: boolean = false, source?: 'local' | 'cloud') => {
        let flow: FlowGraph | null = null;
        setIsProcessing(true);
        setProcessingMessage('Loading Flow...');
        
        try {
            if (isTemplate) {
                flow = id as any;
            } else if (source === 'cloud') {
                flow = await FlowStorage.loadCloud(id);
            } else {
                flow = FlowStorage.load(id);
            }

            if (ref && 'current' in ref && ref.current && flow) {
                // Ensure ID is carried over (critical for usage tracking)
                if (!flow.id) flow.id = id;
                
                await ref.current.loadFlow(flow);
            }
        } catch (e) {
            console.error('Failed to load flow:', e);
        } finally {
            setIsProcessing(false);
        }

        if (!flow) return;
        
        if (blocks.length > 2) { 
            setDialogConfig({
                isOpen: true,
                title: 'Discard Changes',
                message: 'Discard current changes and load this flow?',
                confirmLabel: 'Discard & Load',
                onConfirm: () => {
                    performLoad(flow, id, isTemplate);
                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                }
            });
            return;
        }

        performLoad(flow, id, isTemplate);
    };

    const performLoad = (flow: FlowGraph, id: string, isTemplate: boolean) => {

        try {
            const { blocks: newBlocks, name, variables, scenarioSets: newSets, schemaVersion, description } = FlowTransformer.toEditorState(flow);
            console.log('[FlowEditor] Loaded flow:', name, 'Schema:', schemaVersion);
            
            // Architectural Refinement: Orphan Cleanup
            // Remove blocks with a parentId that doesn't exist in the set of IDs
            const allIds = new Set(newBlocks.map(b => b.id));
            const cleanedBlocks = newBlocks.filter(b => !b.parentId || allIds.has(b.parentId));
            
            setBlocks(cleanedBlocks);
            setFlowName(name);
            setFlowDescription(description || '');
            setGlobalVariables(variables);
            setScenarioSets(newSets || []);
            setSchemaVersion(schemaVersion);
            
            if (isTemplate) {
                setCurrentFlowId(null);
                setShowOnboarding?.(false);
            } else {
                setCurrentFlowId(id);
                setIsLoadModalOpen(false);
            }

        } catch (e) {
            console.error(e);
            if ((window as any).addToast) {
                (window as any).addToast('error', 'Failed to load flow: Incompatible data version.');
            }
        }
    };

    const handleLoadTemplate = (flow: FlowGraph) => {
         handleLoadFlow(flow as any, true);
    };

    const handleExport = async () => {
        setIsProcessing(true);
        setProcessingMessage('Exporting Flow...');
        
        try {
            // Generate flow from current state
            const flow = FlowTransformer.toCanonical(
                flowName,
                blocks,
                globalVariables,
                scenarioSets,
                1,
                currentFlowId || undefined,
                flowDescription
            );

            // Encode to .weblens format
            const { encodeWeblens, downloadWeblens } = await import('../utils/weblensFormat');
            const weblensContent = await encodeWeblens(flow, flowName, flowDescription);
            // Trigger download
            const safeFilename = flowName.replace(/[^a-zA-Z0-9_-]/g, '_');
            downloadWeblens(weblensContent, safeFilename);

            if ((window as any).addToast) {
                (window as any).addToast('success', `Flow exported as ${safeFilename}.weblens`);
            }
        } catch (e) {
            console.error(e);
            if ((window as any).addToast) {
                (window as any).addToast('error', 'Failed to export flow');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        
        setIsProcessing(true);
        setProcessingMessage('Importing Flow...');
        
        try {
            if (!file.name.endsWith('.weblens')) {
                throw new Error('Please select a .weblens file');
            }

            // Read file content
            const content = await file.text();

            // Decode .weblens format
            const { decodeWeblens } = await import('../utils/weblensFormat');
            const { metadata, flow } = await decodeWeblens(content);

            // Load the imported flow
            performLoad(flow, crypto.randomUUID(), false);
            
            if ((window as any).addToast) {
                (window as any).addToast('success', `Imported: ${metadata.flow_name}`);
            }
        } catch (e: any) {
            console.error(e);
            if ((window as any).addToast) {
                (window as any).addToast('error', e.message || 'Failed to import flow');
            }
        } finally {
            setIsProcessing(false);
            // Reset file input
            event.target.value = '';
        }
    };

    const resetToNewFlow = (withConfirmation = true) => {
        const performReset = () => {
            setBlocks([{ id: `block_${crypto.randomUUID()}`, ...DEFAULT_BLOCKS.open_page }]);
            setFlowName('My Test Flow');
            setFlowDescription('');
            setGlobalVariables([]);
            setCurrentFlowId(null);
            setDialogConfig(prev => ({ ...prev, isOpen: false }));
        };

        if (withConfirmation) {
            setDialogConfig({
                isOpen: true,
                title: 'New Flow',
                message: 'Create a new flow? All unsaved changes on the current canvas will be lost.',
                confirmLabel: 'Create New',
                isDestructive: true,
                onConfirm: performReset
            });
        } else {
            performReset();
        }
    };

    const handleDeleteCurrent = () => {
        if (!currentFlowId) {
            resetToNewFlow(true);
            return;
        }
        if (currentFlowId) {
            setDialogConfig({
                isOpen: true,
                title: 'Delete Flow',
                message: `Delete "${flowName}"? This cannot be undone.`,
                confirmLabel: 'Delete Forever',
                isDestructive: true,
                onConfirm: () => {
                    FlowStorage.delete(currentFlowId);
                    setCurrentFlowId(null);
                    setBlocks([{ id: `block_${crypto.randomUUID()}`, ...DEFAULT_BLOCKS.open_page }]);
                    setFlowName('My Test Flow');
                    setFlowDescription('');
                    setGlobalVariables([]);
                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                }
            });
        }
    };

    const activeBlock = blocks.find(b => b.id === activeDragId);
    const contextUrl = blocks.find(b => b.type === 'open_page')?.params.url;

    // Selection Helpers
    const getConnectedChain = (targetId: string): Set<string> => {
        const chain = new Set<string>();
        
        // Find the root of this chain
        let rootId = targetId;
        const visitedRoot = new Set();
        while (rootId && !visitedRoot.has(rootId)) {
            visitedRoot.add(rootId);
            // Re-evaluating based on EditorBlock parentId
            const currentBlock = blocks.find(x => x.id === rootId);
            if (currentBlock?.parentId) {
                rootId = currentBlock.parentId;
            } else {
                break;
            }
        }

        // BFS to find all descendants from root
        const queue = [rootId];
        while (queue.length > 0) {
            const id = queue.shift()!;
            if (chain.has(id)) continue;
            chain.add(id);
            
            const children = blocks.filter(b => b.parentId === id);
            children.forEach(c => queue.push(c.id));
        }

        return chain;
    };

    const activeFlowIds = useMemo(() => {
        if (!highlightBlockId) return new Set<string>();
        return getConnectedChain(highlightBlockId);
    }, [blocks, highlightBlockId]);

    const handleCanvasClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const isInteractive = target.closest('[data-block-id], button, input, select, textarea');
        if (!isInteractive) {
            onBlockClick?.('');
        }
    };

    // Callback for Overlay structural rendering
    const renderOverlayBlockList = ({ parentId, branchKey }: { parentId: string, branchKey?: string }) => (
        <RenderBlockList 
            blocks={blocks}
            parentId={parentId}
            branchKey={branchKey}
            blockStatuses={blockStatuses}
            blockMessages={blockMessages}
            contextUrl={contextUrl}
            globalVariables={globalVariables}
            deleteBlock={deleteBlock}
            duplicateBlock={duplicateBlock}
            updateBlock={updateBlock}
            onAddBlock={addBlock}
            onRequestPick={onRequestPick}
            onMoveToBranch={handleMoveToBranch}
            highlightBlockId={highlightBlockId}
            onBlockClick={onBlockClick}
            activeSnapTarget={activeSnapTarget}
            activeFlowIds={activeFlowIds}
            selectionExists={!!highlightBlockId}
            savedValues={normalizedSavedValues}
        />
    );



    return (
      <div className="flex h-full bg-gray-950 text-gray-200 font-sans">
        {/* Sidebar */}
        <div 
          style={{ width: isSidebarOpen ? `${sidebarWidth}px` : '0px' }}
          className={`
            flex flex-col border-r border-zinc-900 bg-black relative z-40
            ${isResizingSidebar ? '' : 'transition-[width] duration-300'}
        `}>
          {/* VSCode-style Header */}
          <div className="p-4 border-b border-white/10 bg-zinc-900/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Blocks</span>
              </div>
          </div>

          {/* Resizer Handle */}
          {isSidebarOpen && (
            <div 
                onMouseDown={(e) => {
                    e.preventDefault();
                    setIsResizingSidebar(true);
                }}
                className={`absolute -right-0.5 top-0 bottom-0 w-1 cursor-col-resize z-40 transition-colors ${isResizingSidebar ? 'bg-white' : 'hover:bg-white/50'}`}
                title="Resize Sidebar"
            />
          )}

          <div className={`flex flex-col h-full overflow-hidden ${!isSidebarOpen && 'hidden'}`}>
              {/* Search Blocks */}
              <div className="p-4 border-b border-white/10 flex-none">
                <input
                  type="text"
                  placeholder="Search blocks..."
                  value={blockSearchQuery}
                  onChange={(e) => setBlockSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/5 rounded px-3 py-2 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-all font-bold tracking-tight"
                />
              </div>

              {/* Scrollable Blocks Section */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">

              {/* Core Blocks */}
                <div>
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 cursor-default select-none">Core</h2>
                  <div className="grid gap-2">
                    {(['ai_prompt', 'open_page', 'delay', 'refresh_page', 'wait_for_page_load'] as BlockType[])
                      .filter(type => DEFAULT_BLOCKS[type].label.toLowerCase().includes(blockSearchQuery.toLowerCase()))
                      .map(type => (
                      <button
                        key={type}
                        onClick={() => addBlock(type)}
                        className="flex items-center gap-3 w-full p-3 rounded-lg border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 hover:border-white/10 transition-all text-left group"
                      >
                        <div className="p-1.5 rounded bg-black text-zinc-500 group-hover:bg-white group-hover:text-black transition-all border border-white/5 shadow-inner">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors">
                          {DEFAULT_BLOCKS[type].label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Control Flow */}
                <div>
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 cursor-default select-none">Control Flow</h2>
                  <div className="grid gap-2">
                    {(['if_condition', 'repeat_until'] as BlockType[])
                      .filter(type => DEFAULT_BLOCKS[type].label.toLowerCase().includes(blockSearchQuery.toLowerCase()))
                      .map(type => (
                      <button
                        key={type}
                        onClick={() => addBlock(type)}
                        className="flex items-center gap-3 w-full p-3 rounded-lg border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 hover:border-white/10 transition-all text-left group"
                      >
                        <div className="p-1.5 rounded bg-black text-zinc-500 group-hover:bg-white group-hover:text-black transition-all border border-white/5 shadow-inner">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors">
                          {DEFAULT_BLOCKS[type].label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div>
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 cursor-default select-none">Actions</h2>
                  <div className="grid gap-2">
                    {(['click_element', 'enter_text', 'submit_form', 'submit_current_input', 'activate_primary_action', 'select_option', 'upload_file'] as BlockType[])
                      .filter(type => DEFAULT_BLOCKS[type].label.toLowerCase().includes(blockSearchQuery.toLowerCase()))
                      .map(type => (
                      <button
                        key={type}
                        onClick={() => addBlock(type)}
                        className="flex items-center gap-3 w-full p-3 rounded-lg border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 hover:border-white/10 transition-all text-left group"
                      >
                        <div className="p-1.5 rounded bg-black text-zinc-500 group-hover:bg-white group-hover:text-black transition-all border border-white/5 shadow-inner">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors">
                          {DEFAULT_BLOCKS[type].label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dialog */}
                <div>
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 cursor-default select-none">Dialog</h2>
                  <div className="grid gap-2">
                    {(['confirm_dialog', 'dismiss_dialog'] as BlockType[])
                      .filter(type => DEFAULT_BLOCKS[type].label.toLowerCase().includes(blockSearchQuery.toLowerCase()))
                      .map(type => (
                      <button
                        key={type}
                        onClick={() => addBlock(type)}
                        className="flex items-center gap-3 w-full p-3 rounded-lg border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 hover:border-white/10 transition-all text-left group"
                      >
                        <div className="p-1.5 rounded bg-black text-zinc-500 group-hover:bg-white group-hover:text-black transition-all border border-white/5 shadow-inner">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors">
                          {DEFAULT_BLOCKS[type].label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Verification */}
                <div>
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 cursor-default select-none">Verification</h2>
                  <div className="grid gap-2">
                    {(['wait_until_visible', 'assert_visible', 'verify_text', 'verify_page_content', 'verify_page_title', 'verify_url', 'verify_element_enabled', 'verify_network_request', 'verify_performance', 'observe_network'] as BlockType[])
                      .filter(type => DEFAULT_BLOCKS[type].label.toLowerCase().includes(blockSearchQuery.toLowerCase()))
                      .map(type => (
                      <button
                        key={type}
                        onClick={() => addBlock(type)}
                        className="flex items-center gap-3 w-full p-3 rounded-lg border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 hover:border-white/10 transition-all text-left group"
                      >
                        <div className="p-1.5 rounded bg-black text-zinc-500 group-hover:bg-white group-hover:text-black transition-all border border-white/5 shadow-inner">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors">
                          {DEFAULT_BLOCKS[type].label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Navigation */}
                <div>
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 cursor-default select-none">Navigation</h2>
                  <div className="grid gap-2">
                    {(['scroll_to_element', 'switch_tab'] as BlockType[])
                      .filter(type => DEFAULT_BLOCKS[type].label.toLowerCase().includes(blockSearchQuery.toLowerCase()))
                      .map(type => (
                      <button
                        key={type}
                        onClick={() => addBlock(type)}
                        className="flex items-center gap-3 w-full p-3 rounded-lg border border-white/5 bg-zinc-900/50 hover:bg-zinc-800 hover:border-white/10 transition-all text-left group"
                      >
                        <div className="p-1.5 rounded bg-black text-zinc-500 group-hover:bg-white group-hover:text-black transition-all border border-white/5 shadow-inner">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors">
                          {DEFAULT_BLOCKS[type].label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Data */}
                <div>
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 cursor-default select-none">Data</h2>
                  <div className="grid gap-2">
                    {(['save_text', 'save_page_content', 'use_saved_value', 'get_cookies', 'get_local_storage', 'get_session_storage'] as BlockType[])
                      .filter(type => DEFAULT_BLOCKS[type].label.toLowerCase().includes(blockSearchQuery.toLowerCase()))
                      .map(type => (
                      <button
                        key={type}
                        onClick={() => addBlock(type)}
                        className="flex items-center gap-3 w-full p-3 rounded-lg border border-white/5 bg-gray-800/50 hover:bg-gray-800 hover:border-indigo-500/30 transition-all text-left group"
                      >
                        <div className="p-1.5 rounded bg-gray-900 text-gray-400 group-hover:text-indigo-400">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm font-medium text-gray-300 group-hover:text-white">
                          {DEFAULT_BLOCKS[type].label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Variables Section */}
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider cursor-default select-none">Global Variables</h2>
                    <button 
                      onClick={() => setGlobalVariables(prev => [...prev, { id: `var_${crypto.randomUUID()}`, key: `var_${prev.length + 1}`, value: '' }])}
                      className="p-1 rounded bg-gray-900 border border-white/10 text-gray-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {globalVariables.map((variable) => (
                      <div key={variable.id} className="group relative bg-gray-800/30 border border-white/5 rounded p-2 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            placeholder="Name..."
                            value={variable.key}
                            onChange={(e) => setGlobalVariables(prev => prev.map(v => v.id === variable.id ? { ...v, key: e.target.value } : v))}
                            className="bg-black/20 border border-white/5 rounded px-1.5 py-0.5 text-[10px] font-mono text-white focus:outline-none focus:border-white/20 w-full"
                          />
                          <button 
                            onClick={() => setGlobalVariables(prev => prev.filter(v => v.id !== variable.id))}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-500 hover:text-rose-500 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <input 
                          type="text" 
                          placeholder="Value..."
                          value={variable.value}
                          onChange={(e) => setGlobalVariables(prev => prev.map(v => v.id === variable.id ? { ...v, value: e.target.value } : v))}
                          className="bg-black/20 border border-white/5 rounded px-1.5 py-0.5 text-[10px] text-zinc-400 focus:outline-none focus:border-white/20 w-full"
                        />
                      </div>
                    ))}
                    {globalVariables.length === 0 && (
                      <p className="text-[10px] text-gray-600 italic px-1">No variables defined</p>
                    )}
                  </div>
                </div>

                {/* Scenario Testing Section */}
                <div className="pt-4 border-t border-white/10">
                  <ScenarioPanel 
                    flowJson={FlowTransformer.toCanonical(flowName, blocks, globalVariables, scenarioSets, schemaVersion)}
                    onExecutionComplete={(report) => {
                      setSuiteReport(report);
                    }}
                    onUpdateFlow={(updatedFlow) => {
                      setScenarioSets(updatedFlow.scenario_sets || []);
                      // Auto-save when a set is updated
                      setTimeout(handleSave, 100);
                    }}
                  />
                </div>
              </div>
              
              <div className="border-t border-white/10 p-4 space-y-4 bg-black flex-none">

                 <div className="space-y-1.5">
                     <label className="text-[9px] uppercase text-zinc-600 font-black tracking-widest">Flow Name</label>
                     <input
                      value={flowName}
                      onChange={e => setFlowName(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/5 rounded px-3 py-2 text-sm focus:outline-none focus:border-white/20 transition-all placeholder:text-zinc-700 font-bold tracking-tight"
                      placeholder="e.g. Checkout Test"
                    />
                 </div>
                 
                  <div className="grid grid-cols-2 gap-2 mt-4">
                      <button 
                         onClick={handleSave}
                         className="flex items-center justify-center gap-2 bg-white text-black py-2 rounded-md text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 border border-white"
                      >
                         <Save className="w-3.5 h-3.5" />
                         Save
                      </button>
                      <button 
                         onClick={handleOpenLoadModal}
                         className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white py-2 rounded-md text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-white/10 active:scale-95 shadow-lg"
                      >
                         <FolderOpen className="w-3.5 h-3.5" />
                         Load
                      </button>
                      <input 
                         id="import-file-input"
                         type="file"
                         accept=".weblens"
                         style={{ display: 'none' }}
                         onChange={handleImport}
                      />
                      <button 
                         onClick={handleDeleteCurrent}
                         className={`flex items-center justify-center gap-2 col-span-2 py-2 rounded-md text-[10px] font-black uppercase tracking-[0.2em] transition-all border active:scale-95 ${
                            currentFlowId 
                            ? 'bg-zinc-950 border-white/20 text-white hover:bg-zinc-900 shadow-inner' 
                            : 'bg-zinc-900 border-white/5 text-zinc-500 hover:bg-zinc-800'
                         }`}
                      >
                         {currentFlowId ? <Trash2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                         {currentFlowId ? 'Delete Flow' : 'Clear Canvas'}
                      </button>
                  </div>
              </div>
          </div>
        </div>

        
        {/* Helper Handle when closed to reopen easily if the small toggle is hard to hit (optional, keeping clean for now) */}



        {/* Main Content Area (Canvas + AI Panel Overlay) */}
        <div className="flex-1 flex relative h-full overflow-hidden">
        
        {/* Main Canvas Area */}
        <div 
            className={cn(
               "flex-1 relative overflow-hidden bg-black select-none cursor-grab active:cursor-grabbing transition-all duration-500",
               // viewMode === 'agent' ? "w-0 h-0 opacity-0 overflow-hidden" : "flex-1 opacity-100 visible scale-100" // REMOVED: Canvas stays visible
            )}
            onClick={handleCanvasClick}
            onWheel={(e) => {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? 0.9 : 1.1;
                    setView(prev => ({ ...prev, scale: Math.min(Math.max(0.2, prev.scale * delta), 3) }));
                } else {
                     setView(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
                }
            }}
            onMouseDown={(e) => {
                 const target = e.target as HTMLElement;
                 const isInteractive = target.closest('[data-block-id], button, input, select, textarea, [role="button"]');
                 
                 // Enable panning on middle mouse button or when clicking on non-interactive canvas areas
                 if (e.button === 1 || !isInteractive) {
                     if (e.button === 1) e.preventDefault();
                     setIsPanning(true);
                 }
            }}
            onMouseMove={(e) => {
                if (isPanning) {
                    setView(prev => ({ ...prev, x: prev.x + e.movementX, y: prev.y + e.movementY }));
                }
            }}
            onMouseUp={() => setIsPanning(false)}
            onMouseLeave={() => setIsPanning(false)}
        >
          {/* Canvas Component */}
          <div 
             className="absolute inset-0 canvas-bg opacity-100 transition-opacity duration-500"
             style={{ 
                 backgroundPosition: `${view.x}px ${view.y}px`,
                 backgroundSize: `${20 * view.scale}px ${20 * view.scale}px`,
                 backgroundImage: `radial-gradient(rgba(255,255,255,0.1) ${1.5 * view.scale}px, transparent ${1.5 * view.scale}px)`
             }} 
          />

          {/* Transform Container */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}

            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
          >
                <div 
                    style={{ 
                        transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
                        transformOrigin: '0 0',
                    }}
                    className="absolute inset-0 w-full h-full"
                >
                    <div className="relative w-full h-full min-w-[10000px] min-h-[10000px]">
                        <RenderBlockList 
                            blocks={blocks}
                            parentId={undefined}
                            branchKey={undefined}
                            blockStatuses={blockStatuses}
                            blockMessages={blockMessages}
                            contextUrl={contextUrl}
                            globalVariables={globalVariables}
                            deleteBlock={deleteBlock}
                            duplicateBlock={duplicateBlock}
                            updateBlock={updateBlock}
                            onAddBlock={addBlock}
                            onRequestPick={onRequestPick}
                            onMoveToBranch={handleMoveToBranch}
                            highlightBlockId={highlightBlockId}
                            onBlockClick={onBlockClick}
                            activeSnapTarget={activeSnapTarget}
                            activeFlowIds={activeFlowIds}
                            selectionExists={!!highlightBlockId}
                            savedValues={normalizedSavedValues}
                        />


                        {blocks.filter(b => !b.parentId).length === 0 && (
                            <div className="text-center py-20 text-gray-500 border-2 border-dashed border-white/5 rounded-xl canvas-bg">
                                <p>Drag blocks here or click to add</p>
                            </div>
                        )}

                        <SnapGuides 
                            activeSnapTarget={activeSnapTarget}
                            blocks={blocks}
                            effectivePositions={effectivePositions}
                        />
                    </div>
                </div>

                <DragOverlay dropAnimation={null}>
                    {activeBlock ? (
                        <div style={{ 
                            transform: `scale(${view.scale})`,
                            transformOrigin: 'top left',
                            willChange: 'transform',
                            zIndex: 1000
                        }}>
                            <BaseBlockOverlay
                                id={activeBlock.id} 
                                block={activeBlock} 
                                isActive 
                                blocks={blocks}
                                renderBlockList={renderOverlayBlockList}
                            /> 
                        </div>
                    ) : null}
                </DragOverlay>
          </DndContext>
          
          {/* Canvas Toolbar */}
          <div className="absolute top-6 right-6 flex flex-col gap-2 z-50">
             <button 
                onClick={resetView}
                className="flex items-center justify-center p-3 bg-zinc-950 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all shadow-[0_10px_40px_rgba(0,0,0,0.5)] active:scale-95 group"
                title="Reset View"
             >
                <LocateFixed className="w-4 h-4 group-hover:scale-110 transition-transform" />
             </button>

             <button 
                onClick={() => setIsGenieOpen(!isGenieOpen)}
                className={cn(
                    "flex items-center justify-center p-3 bg-zinc-950 border rounded-xl transition-all shadow-[0_10px_40px_rgba(0,0,0,0.5)] active:scale-95 group",
                    isGenieOpen ? "border-indigo-500 text-indigo-400" : "border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-900"
                )}
                title="Toggle Genie AI"
             >
                <Wand2 className={cn("w-4 h-4 transition-transform", isGenieOpen ? "scale-110" : "group-hover:rotate-12")} />
             </button>

             
             <div className="bg-zinc-950 border border-white/10 rounded-xl p-1.5 flex flex-col items-center gap-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                <button 
                    onClick={() => setView(prev => ({ ...prev, scale: Math.min(prev.scale + 0.1, 3) }))}
                    className="flex items-center justify-center p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors"
                >
                    <Plus className="w-4 h-4" />
                </button>
                <div className="text-[10px] font-black w-10 text-center text-zinc-600 tracking-tighter tabular-nums select-none">
                    {Math.round(view.scale * 100)}%
                </div>
                <button 
                    onClick={() => setView(prev => ({ ...prev, scale: Math.max(0.2, prev.scale - 0.1) }))}
                    className="flex items-center justify-center p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors"
                >
                    <Minus className="w-4 h-4" />
                </button>
             </div>
          </div>

          <Minimap 
            blocks={blocks}
            view={view}
            onViewChange={(x, y) => setView({ ...view, x, y })}
          />

          {/* Load Modal */}
          {isLoadModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-zinc-950 border border-white/10 rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,1)] w-[450px] flex flex-col max-h-[80vh] overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-black flex items-center justify-between">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Load Test Flow</h3>
                        <button onClick={() => setIsLoadModalOpen(false)} className="text-zinc-600 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-zinc-950/50">
                        {isLoadingSavedFlows ? (
                            <div className="space-y-2">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Skeleton className="h-3 w-32 rounded-full" />
                                            <Skeleton className="h-4 w-16 rounded-full" />
                                        </div>
                                        <Skeleton className="h-2 w-24 rounded-full opacity-50" />
                                    </div>
                                ))}
                            </div>
                        ) : savedFlows.length === 0 ? (
                            <div className="text-center py-12 text-zinc-600 text-[10px] font-black uppercase tracking-widest italic opacity-50">No saved flows available</div>
                        ) : (
                            savedFlows.map(f => (
                                <div key={f.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 group border border-transparent hover:border-white/10 transition-all cursor-pointer shadow-sm active:scale-[0.98]" onClick={() => handleLoadFlow(f.id, false, (f as any).primarySource)}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="text-[11px] font-black uppercase tracking-widest text-zinc-300 group-hover:text-white transition-colors truncate">{f.name}</div>
                                            <div className="flex gap-1">
                                                {(f as any).sources?.includes('cloud') && (
                                                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[8px] font-black uppercase tracking-widest border border-indigo-500/20">
                                                        <Globe className="w-2.5 h-2.5" />
                                                        Cloud
                                                    </span>
                                                )}
                                                {(f as any).sources?.includes('local') && (
                                                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 text-[8px] font-black uppercase tracking-widest border border-zinc-500/20">
                                                        <Laptop className="w-2.5 h-2.5" />
                                                        Local
                                                    </span>
                                                )}
                                                {!(f as any).sources && (f.source === 'cloud' ? (
                                                     <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[8px] font-black uppercase tracking-widest border border-indigo-500/20">
                                                        <Globe className="w-2.5 h-2.5" />
                                                        Cloud
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 text-[8px] font-black uppercase tracking-widest border border-zinc-500/20">
                                                        <Laptop className="w-2.5 h-2.5" />
                                                        Local
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-tight">
                                            {f.lastUsedAt ? 'Loaded ' : 'Updated '} 
                                            {getRelativeTime(f.lastUsedAt || f.updatedAt)}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            setDialogConfig({
                                                isOpen: true,
                                                title: 'Delete Flow',
                                                message: `How would you like to delete "${f.name}"?`,
                                                confirmLabel: (f as any).sources?.length > 1 ? 'Delete Everywhere' : 'Delete',
                                                secondaryLabel: (f as any).sources?.includes('cloud') && (f as any).sources?.includes('local') ? 'Delete from Cloud' : undefined,
                                                tertiaryLabel: (f as any).sources?.includes('cloud') && (f as any).sources?.includes('local') ? 'Delete Locally' : undefined,
                                                isDestructive: true,
                                                onConfirm: async () => {
                                                    const sources = (f as any).sources || [f.source];
                                                    if (sources.includes('cloud')) {
                                                        await FlowStorage.deleteCloud(f.id);
                                                    }
                                                    if (sources.includes('local')) {
                                                        FlowStorage.delete(f.id);
                                                    }
                                                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                                                    await handleOpenLoadModal();
                                                },
                                                onSecondary: async () => {
                                                    await FlowStorage.deleteCloud(f.id);
                                                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                                                    await handleOpenLoadModal();
                                                },
                                                onTertiary: async () => {
                                                    FlowStorage.delete(f.id);
                                                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                                                    await handleOpenLoadModal();
                                                }
                                            });
                                        }}
                                        className="p-2.5 rounded-lg text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
          )}

            <OnboardingModal 
                onDismiss={() => setShowOnboarding?.(false)} 
                onLoadFlow={handleLoadTemplate} 
                forceOpen={!!showOnboarding}
            />

            <ConfirmationDialog 
                {...dialogConfig}
                onCancel={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
            />

            {/* Scenario Suite Dashboard Overlay */}
            {suiteReport && (
                <div className="fixed inset-0 z-[100] bg-black">
                <ScenarioSuiteDashboard 
                    report={suiteReport}
                    flowJson={FlowTransformer.toCanonical(flowName, blocks, globalVariables, scenarioSets, schemaVersion)}
                    onViewScenario={(runId) => {
                        console.log("View scenario:", runId);
                        onViewScenario?.(runId);
                    }}
                    onBackToEditor={() => setSuiteReport(null)}
                />
                </div>
            )}
        </div>


        {/* Action Loading Overlay */}
        {isProcessing && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
                <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-4 shadow-2xl">
                    <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                    <div className="flex items-center gap-2">
                        {processingMessage.toLowerCase().includes('cloud') && <Globe className="w-4 h-4 text-indigo-400" />}
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white animate-pulse">{processingMessage}</span>
                    </div>
                </div>
            </div>
        )}
        
        </div>

        {/* Right Sidebar - Genie AI */}
        <div 
          style={{ width: isGenieOpen ? '320px' : '0px' }}
          className={cn(
            "flex flex-col border-l border-zinc-900 bg-black relative z-40 overflow-hidden",
            isGenieOpen ? "opacity-100" : "opacity-0 pointer-events-none",
            "transition-all duration-300"
          )}
        >
          <GeniePrompt 
                isSidePanel 
                onFlowGenerated={(flow) => {
                    performLoad(flow, crypto.randomUUID(), false);
                }}
                addToast={(window as any).addToast}
                variables={activeVariables}
                onClose={() => setIsGenieOpen(false)}
             />
        </div>

        {/* Global Resize Overlay */}
        {isResizingSidebar && (
            <div className="fixed inset-0 z-[9999] cursor-col-resize" />
        )}
      </div>
    );
  }
);
