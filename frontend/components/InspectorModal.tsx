import { useState, useEffect } from 'react';
import { X, ExternalLink, Target, Loader2, AlertCircle } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';

interface InspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onElementPicked: (element: any) => void;
  contextUrl?: string;
  blockType?: string | null;
}

const REQUIRED_CAPABILITIES: Record<string, string> = {
    'enter_text': 'editable',
    'click_element': 'clickable',
    'select_option': 'select_like',
    'upload_file': 'file_input',
    'save_text': 'readable',
    'submit_form': 'submittable',
    'condition_text_match': 'readable'
};

const CAPABILITY_MESSAGES: Record<string, string> = {
    'editable': 'This element cannot accept text input.',
    'clickable': 'This element does not appear to be clickable.',
    'select_like': 'This element is not a dropdown or select menu.',
    'file_input': 'This element is not a file upload input.',
    'readable': 'This element does not contain readable text.',
    'submittable': 'This element cannot be submitted as a form.'
};

export const InspectorModal: React.FC<InspectorModalProps> = ({
  isOpen,
  onClose,
  onElementPicked,
  contextUrl,
  blockType,
}) => {
  const [inspectorUrl, setInspectorUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [showResyncNotice, setShowResyncNotice] = useState(false);
  const [lastPickedElement, setLastPickedElement] = useState<any | null>(null);
  const [mismatchWarning, setMismatchWarning] = useState<string | null>(null);

  // Auto-connect to WebSocket when modal opens
  const wsRef = useState<{ current: WebSocket | null }>({ current: null })[0]; 

  const connectWebSocket = () => {
      // Close existing if open
      if (wsRef.current) {
          wsRef.current.close();
      }

      console.log('Attempting to connect to Inspector WebSocket...');
      const ws = new WebSocket('ws://localhost:8000/ws/inspector');
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('Inspector WebSocket connected');
        setIsLoading(false);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'picked_element') {
          const element = data.element;
          setLastPickedElement(element);
          
          // Check for capability mismatch
          const required = blockType ? REQUIRED_CAPABILITIES[blockType] : null;
          if (required && element.capabilities && !element.capabilities[required]) {
              setMismatchWarning(CAPABILITY_MESSAGES[required] || `This element lacks the required capability: ${required}`);
          } else {
              setMismatchWarning(null);
              // Auto-confirm if no mismatch or no required capability
              onElementPicked(element);
              ws.close();
              onClose();
          }
        } else if (data.type === 'inspector_status') {
            if (data.status === 'running') {
                setInspectorUrl('opened');
            } else {
                setInspectorUrl('');
            }
        } else if (data.type === 'url_changed') {
            console.log('Inspector URL changed to:', data.url);
            setCurrentUrl(data.url);
            setShowResyncNotice(true);
            resyncInspector();
        }
      };

      ws.onclose = () => {
        setInspectorUrl(''); // Reset UI on close
        setShowResyncNotice(false);
      };

      ws.onerror = () => {
        console.log('WebSocket connect failed (inspector might be closed)');
        setInspectorUrl(''); // Reset UI on failure
      };
      
      return ws;
  };

  useEffect(() => {
    if (!isOpen) {
        setLastPickedElement(null);
        setMismatchWarning(null);
        return;
    }

    // Try connecting immediately in case inspector is already running
    connectWebSocket();

    return () => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    };
  }, [isOpen]);

  const startInspector = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.INSPECTOR_START, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: contextUrl || 'https://example.com' }),
      });

      if (!response.ok) throw new Error('Failed to start inspector');
      setInspectorUrl('opened');
      connectWebSocket();
    } catch (error) {
      console.error('Failed to start inspector:', error);
      setIsLoading(false);
    }
  };

  const resyncInspector = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.INSPECTOR_RESYNC, {
        method: 'POST',
      });
      if (response.ok) {
          setShowResyncNotice(false);
          console.log('Inspector resynced successfully');
      }
    } catch (error) {
      console.error('Failed to resync inspector:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-zinc-950 border border-white/10 rounded-2xl shadow-[0_30px_100px_rgba(0,0,0,1)] max-w-xl w-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Target className="w-4 h-4 text-indigo-400" />
             </div>
             <div className="flex flex-col">
                <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Element Inspector</h2>
                {blockType && (
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                        Configuring: {blockType.replace(/_/g, ' ')}
                    </span>
                )}
             </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-500 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-8 space-y-6">
          {!inspectorUrl ? (
            <div className="text-center space-y-6 py-4">
              <div className="space-y-2">
                <p className="text-sm text-zinc-300 font-medium leading-relaxed">
                  Ready to map your application
                </p>
                <p className="text-[11px] text-zinc-500 leading-relaxed max-w-xs mx-auto">
                  Opening the inspector will launch a dedicated browser instance. Select any element to capture its semantic identity.
                </p>
              </div>
              
              <button
                onClick={startInspector}
                disabled={isLoading}
                className="group relative px-8 py-3 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:bg-zinc-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mx-auto flex items-center gap-2 shadow-[0_10px_40px_rgba(255,255,255,0.1)]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    Open Inspector
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {mismatchWarning ? (
                <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-4 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <AlertCircle className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] text-amber-500 font-black uppercase tracking-widest">
                                Capability Warning
                            </p>
                            <p className="text-[13px] text-zinc-200 font-medium leading-relaxed">
                                {mismatchWarning}
                            </p>
                            <p className="text-[11px] text-zinc-500 leading-relaxed">
                                This element might not work as expected for this block type. You can search for a different element or confirm this anyway.
                            </p>
                        </div>
                    </div>
                    
                    <div className="pt-2 flex items-center gap-3">
                        <button 
                            onClick={() => {
                                onElementPicked(lastPickedElement);
                                if (wsRef.current) wsRef.current.close();
                                onClose();
                            }}
                            className="flex-1 px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            Confirm Selection
                        </button>
                        <button 
                            onClick={() => {
                                setMismatchWarning(null);
                                setLastPickedElement(null);
                            }}
                            className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            Pick Another
                        </button>
                    </div>
                </div>
              ) : (
                <div className="p-5 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl flex items-start gap-4">
                    <div className="mt-1 w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_#6366f1]" />
                    <div className="space-y-1">
                        <p className="text-[11px] text-indigo-400 font-black uppercase tracking-widest">
                           Live Session Active
                        </p>
                        <p className="text-[12px] text-zinc-400 leading-relaxed">
                           Click any element in the inspector window to capture its properties.
                        </p>
                    </div>
                </div>
              )}

              <div className="p-4 bg-black/40 border border-white/5 rounded-xl space-y-3">
                <div className="flex items-center justify-between opacity-40">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Status</span>
                    <span className="text-[9px] font-mono text-zinc-500">{lastPickedElement ? 'Element Picked' : 'Awaiting Input'}</span>
                </div>
                {lastPickedElement && (
                    <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg border border-white/5 animate-in fade-in duration-200">
                        <div className="w-8 h-8 rounded bg-zinc-900 border border-white/10 flex items-center justify-center font-mono text-[10px] text-indigo-400">
                            &lt;/&gt;
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-zinc-300 truncate">
                                {lastPickedElement.name || lastPickedElement.tagName || 'Selected Element'}
                            </p>
                            <p className="text-[9px] text-zinc-600 font-mono truncate">
                                {lastPickedElement.selector?.slice(0, 50)}...
                            </p>
                        </div>
                    </div>
                )}
                {!lastPickedElement && (
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500/50 w-1/3 animate-[shimmer_2s_infinite]" style={{
                            backgroundSize: '200% 100%',
                            backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)'
                        }} />
                    </div>
                )}
                {currentUrl && (
                    <div className="pt-2 border-t border-white/5 mt-2">
                        <span className="text-[9px] font-mono text-zinc-600 break-all select-all hover:text-zinc-400 transition-colors">
                            {currentUrl}
                        </span>
                    </div>
                )}
              </div>
              
              {showResyncNotice && (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2">
                      <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tight">Navigation detected</span>
                      </div>
                      <button 
                        onClick={resyncInspector}
                        className="text-[9px] font-black text-emerald-500 hover:text-white uppercase tracking-widest transition-colors"
                      >
                        Auto-Resync
                      </button>
                  </div>
              )}

              <div className="grid grid-cols-1 gap-2 pt-2">
                <button
                    onClick={resyncInspector}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:shadow-xl active:scale-95"
                >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Resync Picker
                </button>
                <button
                    onClick={startInspector}
                    disabled={isLoading}
                    className="py-2 text-[9px] text-zinc-600 hover:text-zinc-400 font-bold uppercase tracking-widest transition-colors"
                >
                    Capture window lost? Relaunch Inspector
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
