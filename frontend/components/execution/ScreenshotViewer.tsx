import React, { useState } from 'react';

interface Props {
  screenshot?: string;
}

export const ScreenshotViewer: React.FC<Props> = ({ screenshot }) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  if (!screenshot) {
    return (
      <div className="h-full w-full flex items-center justify-center text-zinc-600 flex-col gap-2">
        <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-xs uppercase tracking-widest font-semibold">No screenshot captured</p>
      </div>
    );
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(Math.max(prev * delta, 0.5), 5));
  };

  return (
    <div 
      className="h-full w-full relative cursor-grab active:cursor-grabbing overflow-hidden group bg-[#0a0a0a]"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <div 
        className="absolute transition-transform duration-75"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <img 
          src={screenshot} 
          alt="Execution state" 
          className="max-w-none shadow-2xl border border-zinc-700 pointer-events-none rounded-sm"
          style={{ width: '80%' }}
        />
      </div>

      {/* Controls Overlay */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 backdrop-blur-md border border-zinc-800 px-3 py-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))} className="p-1 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
        </button>
        <span className="text-[10px] tabular-nums font-bold min-w-[40px] text-center text-zinc-300">
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))} className="p-1 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
        <div className="w-px h-3 bg-zinc-800 mx-1" />
        <button onClick={() => { setZoom(1); setPosition({ x: 0, y: 0 }); }} className="text-[10px] font-bold px-2 hover:text-white transition-colors text-zinc-500 uppercase">
          Reset
        </button>
      </div>
    </div>
  );
};
