import { useState } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { BaseBlock, BlockData } from './BaseBlock';
import { BlocksIcon } from 'lucide-react';

const INITIAL_BLOCKS: BlockData[] = [
  { id: '1', type: 'open_page', params: { url: 'https://staging.app.com' }, status: 'success' },
  { id: '2', type: 'wait_until_visible', params: { element: 'login_modal' }, status: 'running' },
  { id: '3', type: 'enter_text', params: { text: 'admin@weblens.io', element: 'email_input' }, status: 'idle' },
  { id: '4', type: 'click_element', params: { element: 'submit_btn' }, status: 'idle' },
  { id: '5', type: 'verify_text', params: { match: { mode: 'contains', value: 'Dashboard' }, element: 'header' }, status: 'idle' },
];

export function FlowEditorDemo() {
  const [blocks, setBlocks] = useState<BlockData[]>(INITIAL_BLOCKS);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 4, 
        }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }

    setActiveId(null);
  };

  const handleDelete = (id: string) => {
      setBlocks(blocks.filter(b => b.id !== id));
  };
  
  const activeItem = blocks.find(b => b.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="border border-border bg-card rounded-xl overflow-hidden">
        {/* Container Header */}
        <div className="h-9 border-b border-border/40 bg-secondary flex items-center justify-between px-4">
           <div className="flex items-center gap-2">
              <BlocksIcon className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-mono tracking-widest text-primary/80">FLOW_EDITOR</span>
           </div>
           <div className="text-[10px] text-muted-foreground font-medium animate-pulse">Try reordering the blocks ↓</div>
        </div>

        <div className="h-[500px] bg-card relative group/canvas">
            {/* Optional: Very subtle grid lines if we want technical feel without dots, or just clean */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
            
            <div className="p-6 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent relative z-10">
                <SortableContext 
                    items={blocks.map(b => b.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="min-h-[200px]" id="canvas-drop-zone">
                        {blocks.map(block => (
                            <BaseBlock 
                                key={block.id} 
                                id={block.id} 
                                block={block} 
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                </SortableContext>
            </div>
        </div>
      </div>

      <DragOverlay
        dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: { opacity: '0.4' },
            },
          }),
        }}
      >
        {activeId && activeItem ? (
           <BaseBlock 
              id={activeId} 
              block={activeItem} 
              isOverlay 
           />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
