import React, { useMemo } from 'react';
import { EditorBlock } from './entities';

interface MinimapProps {
  blocks: EditorBlock[];
  view: { x: number; y: number; scale: number };
  onViewChange: (x: number, y: number) => void;
  width?: number;
  height?: number;
}

export const Minimap: React.FC<MinimapProps> = ({ 
  blocks, 
  view, 
  onViewChange,
  width = 200,
  height = 150 
}) => {
  // Calculate the bounding box of all blocks to determine the minimap's extent
  const positionedBlocks = useMemo(() => blocks.filter(b => b.position), [blocks]);

  const bounds = useMemo(() => {
    if (positionedBlocks.length === 0) return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    positionedBlocks.forEach(block => {
      if (!block.position) return;
      minX = Math.min(minX, block.position.x);
      minY = Math.min(minY, block.position.y);
      maxX = Math.max(maxX, block.position.x + 200); // Assume avg block width
      maxY = Math.max(maxY, block.position.y + 100); // Assume avg block height
    });

    // Add padding
    const padding = 200;
    return { 
      minX: minX - padding, 
      minY: minY - padding, 
      maxX: maxX + padding, 
      maxY: maxY + padding 
    };
  }, [blocks]);

  const worldWidth = bounds.maxX - bounds.minX;
  const worldHeight = bounds.maxY - bounds.minY;
  
  // Scaling factors to fit the world into the minimap dimensions
  const scale = Math.min(width / worldWidth, height / worldHeight);
  
  const toMinimapX = (x: number) => (x - bounds.minX) * scale;
  const toMinimapY = (y: number) => (y - bounds.minY) * scale;

  // Viewport calculation
  // The viewport on canvas is inverse of view.x/y and depends on the container size
  // For simplicity, we'll estimate the viewport size based on the scale
  const vpWidth = window.innerWidth / view.scale;
  const vpHeight = window.innerHeight / view.scale;
  const vpX = -view.x / view.scale;
  const vpY = -view.y / view.scale;

  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert minimap click to world coordinates
    const worldClickX = clickX / scale + bounds.minX;
    const worldClickY = clickY / scale + bounds.minY;

    // Center the view on this point
    // New view.x = -(worldClickX * view.scale) + (window.innerWidth / 2)
    onViewChange(
      -(worldClickX * view.scale) + window.innerWidth / 2,
      -(worldClickY * view.scale) + window.innerHeight / 2
    );
  };

  return (
    <div 
      className="absolute bottom-6 right-6 border border-white/10 bg-black/80 backdrop-blur-md rounded-lg overflow-hidden shadow-2xl transition-opacity hover:opacity-100 opacity-60 pointer-events-auto"
      style={{ width, height, zIndex: 60 }}
      onClick={handleClick}
    >
      <div className="relative w-full h-full cursor-crosshair">
        {/* All Blocks */}
        {positionedBlocks.map(block => (
          <div 
            key={block.id}
            className="absolute bg-white/20 rounded-sm pointer-events-none"
            style={{
              left: toMinimapX(block.position!.x),
              top: toMinimapY(block.position!.y),
              width: 200 * scale,
              height: 40 * scale,
            }}
          />
        ))}

        {/* Viewport Indicator */}
        <div 
          className="absolute border border-white/40 bg-white/5 pointer-events-none"
          style={{
            left: toMinimapX(vpX),
            top: toMinimapY(vpY),
            width: vpWidth * scale,
            height: vpHeight * scale,
          }}
        />
      </div>
      
      {/* Label */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
        <div className="w-1 h-1 rounded-full bg-zinc-500" />
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500">Minimap</span>
      </div>
    </div>
  );
};
