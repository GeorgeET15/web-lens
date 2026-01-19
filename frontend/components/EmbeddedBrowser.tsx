import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';
import { X, RefreshCw, Loader2, Globe, Check, AlertTriangle, MousePointer2 } from 'lucide-react';

interface ElementData {
  role: string;
  name: string;
  tag: string;
  attributes?: {
      placeholder?: string;
      title?: string;
      testId?: string;
  };
  rect: { x: number; y: number; width: number; height: number };
}

interface SnapshotData {
  screenshot: string; // base64
  elements: ElementData[];
  url: string;
  title: string;
  taf?: {
      trace: string[];
      analysis: string[];
      feedback: string[];
  };
}

interface EmbeddedBrowserProps {
  url: string;
  isOpen: boolean;
  onClose: () => void;
  onPick: (element: ElementData) => void;
}

export function EmbeddedBrowser({ url, isOpen, onClose, onPick }: EmbeddedBrowserProps) {
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [mode, setMode] = useState<'browse' | 'pick'>('browse');
  const [hoveredEl, setHoveredEl] = useState<ElementData | null>(null);
  const [selectedEl, setSelectedEl] = useState<ElementData | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSnapshot();
      setSelectedEl(null);
      setHoveredEl(null);
    }
  }, [isOpen]);

  const loadSnapshot = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post('/api/inspector/embedded/start', {
        url: snapshot?.url || url || 'https://georgeemmanuelthomas.dev'
      });
      setSnapshot(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleInteract = async (action: string, params: Record<string, string | number | boolean>) => {
      if (mode !== 'browse' && action === 'click') return;
      
      setLoading(true);
      try {
          const data = await api.post('/api/inspector/embedded/interact', {
              action, ...params
          });
          
          setSnapshot(data);
          setSelectedEl(null);
          setHoveredEl(null);
      } catch (err) {
          setError(err instanceof Error ? err.message : 'Interaction failed');
      } finally {
          setLoading(false);
      }
  };

  const handleConfirm = () => {
      if (selectedEl) {
          onPick(selectedEl);
      }
  };

  const getConfidenceLevel = (el: ElementData) => {
      if (!el.name || el.name.length < 2) return 'Low';
      if (el.role === 'div' || el.role === 'span') return 'Medium';
      return 'High';
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col font-sans animate-in fade-in duration-200">
      {/* Browser Toolbar */}
      <div className="h-16 bg-zinc-900 border-b border-white/5 flex items-center px-6 gap-6 flex-none shadow-2xl relative z-30">
        <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/5 flex-1 max-w-2xl">
          <Globe className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[11px] truncate font-mono text-zinc-400 select-all tracking-tight">{snapshot?.url || url}</span>
        </div>

        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/5">
            <button 
                onClick={() => setMode('browse')}
                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all ${mode === 'browse' ? 'bg-white text-black shadow-[0_4px_15px_rgba(255,255,255,0.1)]' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                Browse
            </button>
            <button 
                onClick={() => setMode('pick')}
                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all flex items-center gap-2 ${mode === 'pick' ? 'bg-white text-black shadow-[0_4px_15px_rgba(255,255,255,0.1)]' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
                <MousePointer2 className="w-3 h-3" />
                Pick
            </button>
        </div>
        
        <div className="flex items-center gap-2">
            <button 
                onClick={loadSnapshot} 
                disabled={loading}
                className="p-2.5 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-all active:scale-95"
                title="Refresh Snapshot"
            >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="h-4 w-px bg-white/5 mx-2" />
            <button 
                onClick={onClose}
                className="p-2.5 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-500 rounded-xl transition-all active:scale-95"
            >
                <X className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* Browser Viewport */}
      <div className={`flex-1 overflow-auto bg-black relative flex justify-center p-8 transition-all ${mode === 'pick' ? 'cursor-cell' : 'cursor-default'}`}>
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
            <div className={`px-6 py-2 rounded-full border shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-500 ${mode === 'pick' ? 'bg-indigo-500/10 border-indigo-500/30 ring-1 ring-indigo-500/20' : 'bg-black/80 border-white/10'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${mode === 'pick' ? 'bg-indigo-400 animate-pulse shadow-[0_0_8px_#818cf8]' : 'bg-zinc-600'}`} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-100">
                    {mode === 'pick' ? 'Element selection active' : 'Browsing normally  Selection paused'}
                </span>
            </div>
        </div>
        {loading && !snapshot && (
           <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-50">
              <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full" />
                    <Loader2 className="w-12 h-12 text-white animate-spin relative" />
                  </div>
                  <p className="text-[11px] text-zinc-500 font-black uppercase tracking-[0.3em]">Connecting to Cloud Browser</p>
              </div>
           </div>
        )}

        {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-50 p-6">
                <div className="bg-zinc-900 border border-white/5 rounded-2xl shadow-2xl p-10 max-w-md text-center space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-500 shadow-[0_10px_30px_rgba(244,63,94,0.1)]">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Connection Failed</h3>
                        <p className="text-zinc-500 text-xs leading-relaxed">{error}</p>
                    </div>
                    <button 
                        onClick={loadSnapshot} 
                        className="px-8 py-3 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:bg-zinc-200 active:scale-95"
                    >
                        Retry Connection
                    </button>
                </div>
            </div>
        )}

        {snapshot && (
          <div className="relative shadow-[0_50px_100px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden border border-white/5 select-none bg-white">
            <img 
                src={`data:image/png;base64,${snapshot.screenshot}`} 
                alt="Browser View"
                className="block max-w-none" 
            />
            
            {/* Interactive Overlay Layer */}
            <div 
                className="absolute inset-0 z-10"
                onClick={(e) => {
                    if (mode === 'browse' && snapshot) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        
                        // Pass coordinates to backend
                        handleInteract('click', { x, y });
                    }
                }}
            >
                {mode === 'pick' && snapshot.elements.map((el, i) => {
                    const isSelected = selectedEl === el;
                    const isHovered = hoveredEl === el;
                    
                    // Don't render hover if something is selected (unless it IS the selected one)
                    if (selectedEl && !isSelected) return null;

                    return (
                        <div
                            key={i}
                            style={{
                                left: el.rect.x,
                                top: el.rect.y,
                                width: el.rect.width,
                                height: el.rect.height,
                            }}
                            className={`absolute transition-all duration-200 border-2
                                ${isSelected 
                                    ? 'bg-zinc-950/40 border-indigo-500 z-50 shadow-[0_0_0_9999px_rgba(0,0,0,0.7),0_0_30px_rgba(99,102,241,0.5)]' 
                                    : isHovered 
                                        ? 'bg-indigo-500/10 border-indigo-500/50 z-40' 
                                        : 'border-transparent z-10 hover:bg-white/10'
                                }
                            `}
                            onMouseEnter={() => !selectedEl && setHoveredEl(el)}
                            onMouseLeave={() => !selectedEl && setHoveredEl(null)}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEl(el);
                            }}
                        />
                    );
                })}
            </div>
          </div>
        )}
        
        {/* Center Loading Spinner Overlay */}
        {loading && snapshot && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/20 backdrop-blur-[2px] z-[10003] animate-in fade-in duration-300">
                 <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
        )}

        {/* TAF Reasoning Whisper (if page changed) */}
        {snapshot?.taf && (
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[10002] animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-indigo-950/90 backdrop-blur-xl border border-indigo-500/30 rounded-2xl shadow-2xl p-4 max-w-md">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                            <Globe className="w-4 h-4 text-indigo-400" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-tighter text-indigo-300">New Context Detected</span>
                    </div>
                    <p className="text-sm text-white font-medium mb-1">{snapshot.taf.trace[0]}</p>
                    <p className="text-xs text-indigo-200/60 leading-relaxed font-mono">{snapshot.taf.analysis[0]}</p>
                    <div className="mt-3 pt-3 border-t border-indigo-500/20">
                         <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{snapshot.taf.feedback[0]}</p>
                    </div>
                    <button 
                        onClick={() => {
                            const newSnapshot = { ...snapshot };
                            delete newSnapshot.taf;
                            setSnapshot(newSnapshot);
                        }}
                        className="absolute top-3 right-3 text-indigo-400/50 hover:text-white"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        )}

        {/* Hover Tooltip (Only if nothing selected) */}
        {hoveredEl && !selectedEl && (
            <div 
                className="fixed px-4 py-3 bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-[10000] pointer-events-none transform -translate-y-full mt-[-12px] animate-in zoom-in-95 duration-150"
                style={{ 
                    left: Math.min(window.innerWidth - 240, hoveredEl.rect.x + 20),
                    top: hoveredEl.rect.y + 30
                }}
            >
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">{hoveredEl.role}</span>
                    {getConfidenceLevel(hoveredEl) === 'High' && <Check className="w-3 h-3 text-emerald-500" />}
                </div>
                <div className="text-white font-medium text-xs max-w-[200px] truncate italic">"{hoveredEl.name || 'Unnamed'}"</div>
            </div>
        )}

        {/* Confirmation Dialog (Centered) */}
        {selectedEl && (
            <div className="fixed inset-0 z-[10001] flex items-center justify-center pointer-events-none p-4">
                <div className="bg-zinc-950 border border-white/10 rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,1)] p-8 w-96 pointer-events-auto animate-in zoom-in-95 duration-200">
                    <div className="flex items-start justify-between mb-8">
                        <div className="space-y-1">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Confirm Target</h3>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Semantic Verification</p>
                        </div>
                        <button onClick={() => setSelectedEl(null)} className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
 
                    <div className="bg-black/40 rounded-xl p-5 mb-8 space-y-4 border border-white/5">
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Element Role</span>
                            <span className="text-[11px] text-zinc-300 font-black uppercase tracking-tighter">{selectedEl.role}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Visual Name</span>
                            <span className="text-[11px] text-white font-medium italic truncate max-w-[160px] text-right">"{selectedEl.name || 'Unnamed'}"</span>
                        </div>
                         <div className="flex justify-between items-center pt-3 border-t border-white/5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Stability</span>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border
                                ${getConfidenceLevel(selectedEl) === 'High' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20' 
                                : getConfidenceLevel(selectedEl) === 'Medium' ? 'bg-amber-500/5 text-amber-400 border-amber-500/20' 
                                : 'bg-rose-500/5 text-rose-400 border-rose-500/20'}`}>
                                {getConfidenceLevel(selectedEl)}
                            </span>
                        </div>
                        {getConfidenceLevel(selectedEl) === 'Low' && (
                              <div className="flex items-start gap-3 bg-rose-500/5 border border-rose-500/20 p-3 rounded-xl text-[10px] text-rose-400 leading-relaxed italic">
                                <AlertTriangle className="w-3.5 h-3.5 flex-none mt-0.5" />
                                <span>Ambiguous identity detected. Consider selecting a parent with clearer semantics to avoid test flakiness.</span>
                             </div>
                        )}
                    </div>
 
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={handleConfirm}
                            className="bg-white hover:bg-zinc-200 text-black py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_10px_30px_rgba(255,255,255,0.05)]"
                        >
                            <MousePointer2 className="w-3.5 h-3.5" />
                            Use Element
                        </button>
                         <button 
                            onClick={() => setSelectedEl(null)}
                            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white py-3 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>,
    document.body
  );
}
