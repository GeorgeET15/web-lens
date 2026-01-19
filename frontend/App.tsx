import { useState, useEffect, useRef } from 'react';
import { 
  Layers, Play, AlertTriangle, Terminal, Loader2, X, Sparkles,
  Globe, Settings2, Plus, User
} from 'lucide-react';
import type { StreamEvent } from './types/events';
import { API_ENDPOINTS } from './config/api';
import { parseError, type EnrichedError } from './lib/error-parser';
import { FlowEditor, type FlowEditorRef } from './editor/FlowEditor';
import { InspectorModal } from './components/InspectorModal';
import { FlowGraph, FlowBlock } from './types/flow';
import { ElementRef } from './types/element';
import { type TimelineEvent } from './components/ExecutionLog';
import { ExecutionExplorer } from './components/execution/ExecutionExplorer';
import { ExecutionReport } from './types/execution';
import { Environment } from './types/environment';
import { EnvironmentManager } from './components/EnvironmentManager';
import { ToastProvider, useToast } from './components/ToastContext';
import { CustomDropdown } from './components/CustomDropdown';
import { FlowMenu } from './components/FlowMenu';
import { clsx } from 'clsx';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Settings from './pages/Settings';
import { MobileRestricted } from './components/MobileRestricted';


function Dashboard() {
  const { session, user } = useAuth();
  const [currentFlow, setCurrentFlow] = useState<FlowGraph | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [error, setError] = useState<EnrichedError | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [pickingCallback, setPickingCallback] = useState<((element: ElementRef) => void) | null>(null);
  const [activePickingBlockType, setActivePickingBlockType] = useState<string | null>(null);
  const [executionReport, setExecutionReport] = useState<ExecutionReport | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [view, setView] = useState<'editor' | 'settings'>('editor');
  const [explorerHeight, setExplorerHeight] = useState(40);
  const [isResizing, setIsResizing] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [isLoadingEnvs, setIsLoadingEnvs] = useState(false);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string>('');
  const [isEnvManagerOpen, setIsEnvManagerOpen] = useState(false);
  const [isViewerMode, setIsViewerMode] = useState(false);

  
  const eventSourceRef = useRef<EventSource | null>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const blockEditorRef = useRef<FlowEditorRef>(null);

  // Auto-scroll to latest event
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  // Fetch environments on mount
  useEffect(() => {
    fetchEnvironments();
    checkViewerMode();
  }, []);

  // Prevent accidental closure if working on a flow
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Simple heuristic: If a flow is loaded (and not just viewing a report), assume potentially unsaved work
      if (currentFlow && !isViewerMode) {
        e.preventDefault();
        e.returnValue = ''; // Standard for prompting
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentFlow, isViewerMode]);

  const checkViewerMode = async () => {
    const params = new URLSearchParams(window.location.search);
    const reportId = params.get('report');
    if (reportId) {
      setIsViewerMode(true);
      setIsRunning(false);
      try {
        const response = await fetch(`${API_ENDPOINTS.BASE_URL}/api/reports/${reportId}`);
        if (response.ok) {
           const report = await response.json();
           setExecutionReport(report);
           setIsExplorerOpen(true);
           setExplorerHeight(window.innerHeight - 56); // Full height minus header

           // If NOT finished, connect to stream to make it "LIVE"
           if (!report.finished_at) {
                const streamUrl = `${API_ENDPOINTS.STATUS}/${reportId}`;
                const es = new EventSource(streamUrl);
                es.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    if (data.type === 'block_execution' || data.type === 'execution_complete') {
                        // Re-fetch report to get latest structured state
                        fetchExecutionReport(reportId);
                    }
                    if (data.type === 'execution_complete') {
                        es.close();
                    }
                };
                eventSourceRef.current = es;
           }
        } else {
           addToast('error', 'Failed to load shared report');
        }
      } catch (err) {
        addToast('error', 'Error fetching shared report');
      }
    }
  };

  const fetchEnvironments = async () => {
    setIsLoadingEnvs(true);
    try {
      const token = session?.access_token;
      const resp = await fetch(API_ENDPOINTS.ENVIRONMENTS, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (resp.ok) {
        const data = await resp.json();
        setEnvironments(data);
      }
    } catch (err) {
      console.error('Failed to fetch environments:', err);
    } finally {
      setIsLoadingEnvs(false);
    }
  };

  const handleAddEnvironment = async (env: Environment) => {
    try {
      const token = session?.access_token;
      const resp = await fetch(API_ENDPOINTS.ENVIRONMENTS, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(env)
      });
      if (resp.ok) {
        fetchEnvironments();
        addToast('success', 'Environment saved to cloud');
      }
    } catch (err) {
      console.error('Failed to add environment:', err);
      addToast('error', 'Failed to save environment');
    }
  };

  const handleDeleteEnvironment = async (id: string) => {
    try {
      const token = session?.access_token;
      const resp = await fetch(`${API_ENDPOINTS.ENVIRONMENTS}/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (resp.ok) {
        if (selectedEnvironmentId === id) setSelectedEnvironmentId('');
        fetchEnvironments();
        addToast('success', 'Environment deleted');
      }
    } catch (err) {
      console.error('Failed to delete environment:', err);
      addToast('error', 'Failed to delete environment');
    }
  };

  const { addToast } = useToast();

  // Sync Selection: Scroll Canvas when block is selected (e.g. from explorer)

  // Sync Selection: Scroll Canvas when block is selected (e.g. from explorer)
  useEffect(() => {
    if (selectedBlockId && blockEditorRef.current) {
      blockEditorRef.current.scrollToBlock(selectedBlockId);
    }
  }, [selectedBlockId]);


  const handleEvent = (event: MessageEvent) => {
    try {
      const data: StreamEvent = JSON.parse(event.data);

      if (data.type === 'execution_start') {
        setEvents([]);
        setError(null);
        blockEditorRef.current?.clearHighlighting();
      }
      
      if (data.type === 'block_execution') {
        const payload = data.data as { 
            suite_id?: string; 
            status: string; 
            block_id: string; 
            type: string; 
            message: string; 
            screenshot?: string; 
            taf?: any;
        };
        const timestamp = new Date().toISOString();
        const severity = payload.status === 'failed' ? 'error' : 
                         payload.status === 'success' ? 'success' : 'info';

        const timelineEvent: TimelineEvent = {
          id: `${timestamp}-${payload.block_id || Math.random()}`,
          timestamp,
          type: payload.type || 'info',
          message: payload.message || 'Executing block...',
          severity,
          screenshot: payload.screenshot,
          taf: payload.taf
        };
        
        setEvents(prev => [...prev, timelineEvent]);

        // Highlight blocks in editor + auto-scroll
        if (payload.block_id) {
            if (payload.status === 'running') {
                blockEditorRef.current?.highlightBlockActive(payload.block_id, payload.message);
                blockEditorRef.current?.scrollToBlock(payload.block_id);
            } else if (payload.status === 'success') {
                blockEditorRef.current?.highlightBlockSuccess(payload.block_id, payload.message);
            } else if (payload.status === 'failed') {
                blockEditorRef.current?.highlightBlockFailed(payload.block_id, payload.message);
            }
        }
      }

      if (data.type === 'execution_complete') {
        setIsRunning(false);
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        const runId = (data.data as { run_id: string }).run_id;
        if (runId) {
            fetchExecutionReport(runId);
            setIsExplorerOpen(true);
        }
      }

      if (data.type === 'error') {
        const enrichedError = parseError(data.data.message || 'Unknown error occurred');
        setError(enrichedError);
        setIsRunning(false);
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
      }

    } catch (err) {
      console.error('Failed to parse event:', err);
    }
  };

  const fetchExecutionReport = async (runId: string) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.BASE_URL}/api/executions/${runId}`);
      if (response.ok) {
        const report = await response.json();
        setExecutionReport(report);
      }
    } catch (err) {
      console.error('Failed to fetch execution report:', err);
    }
  };

  const handleNewFlow = () => {
    blockEditorRef.current?.createNewFlow();
    setShowOnboarding(false);
  };

  const runTest = async () => {
    if (!currentFlow) return;

    setIsRunning(true);
    setEvents([]);
    setError(null);
    setExecutionReport(null);
    setSelectedBlockId(null);
    blockEditorRef.current?.clearHighlighting();

    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      // setIsExplorerOpen(true); -- Moved to after validation
      // if (explorerHeight < 200) setExplorerHeight(400); -- Moved to after validation
      
      // Always find the true root block (no parent) to use as the entry_block
      const rootBlock = currentFlow.blocks.find(b => {
          // A block is root if no other block has it in their next_block or branch_blocks
          return !currentFlow.blocks.some(other => 
              other.next_block === b.id || 
              (other.then_blocks as string[])?.includes(b.id) ||
              (other.else_blocks as string[])?.includes(b.id) ||
              (other.body_blocks as string[])?.includes(b.id)
          );
      });

      if (!rootBlock) {
        addToast('error', "No entry block found in the flow.");
        setIsRunning(false);
        return;
      }

      const entryBlockId = rootBlock.id;

      const token = session?.access_token;

      // Start execution with the FULL flow
      const response = await fetch(API_ENDPOINTS.EXECUTE, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
             flow: { ...currentFlow, entry_block: entryBlockId },
             headless: false,
             variables: currentFlow?.variables || {},
             environment_id: selectedEnvironmentId || undefined
        }),
      });

      // Handle validation errors (400 Bad Request)
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400 && errorData.detail) {
          const detail = errorData.detail;
          if (detail.validation_errors && Array.isArray(detail.validation_errors)) {
            const errorMessages = detail.validation_errors.join('\n');
            const errorTitle = detail.state === 'draft' ? 'Incomplete Flow' : 'Validation Failed';
            
            // Set error state
            setError({
              title: errorTitle,
              message: errorMessages,
              suggestion: 'Please fix the validation errors in the flow editor before running.',
              category: 'validation' as const,
              raw: JSON.stringify(detail)
            });

            setIsRunning(false);
            return;
          }
        }
        throw new Error('Failed to start execution');
      }

      const { run_id } = await response.json();

      // Successful Start: NOW open the explorer
      setIsExplorerOpen(true);
      if (explorerHeight < 200) setExplorerHeight(400);

      // Connect to status stream
      const streamUrl = `${API_ENDPOINTS.STATUS}/${run_id}`;
      const es = new EventSource(streamUrl);
      
      es.onmessage = handleEvent;
      es.onerror = (err) => {
        console.error('EventSource error:', err);
        setError(parseError('Connection lost'));
        es.close();
        setIsRunning(false);
      };

      eventSourceRef.current = es;

    } catch (err) {
      setError(parseError(err instanceof Error ? err.message : 'Failed to run test'));
      setIsRunning(false);
    }
  };

  // Global Resize Handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newHeight = window.innerHeight - e.clientY;
      const minHeight = 120;
      const maxHeight = window.innerHeight * 0.85;
      
      if (newHeight >= minHeight && newHeight <= maxHeight) {
        setExplorerHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
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
  }, [isResizing]);

  const [pickingOptions, setPickingOptions] = useState<{ autoClose?: boolean }>({});

  const handleElementPicked = async (element: ElementRef) => {
    if (pickingCallback) {
      pickingCallback(element);
    }
    
    // Auto-close browser if requested (AI Flow)
    if (pickingOptions.autoClose) {
      try {
        await fetch(API_ENDPOINTS.INSPECTOR_STOP, { method: 'POST' });
      } catch (e) {
        console.error('Failed to auto-stop inspector:', e);
      }
    }

    setPickingCallback(null);
    setActivePickingBlockType(null);
    setPickingOptions({});
    setIsInspectorOpen(false);
  };

  const handleStartPicking = (blockType: string, callback: (element: ElementRef) => void, options: { autoClose?: boolean } = {}) => {
    setActivePickingBlockType(blockType);
    setPickingCallback(() => callback);
    setPickingOptions(options);
    setIsInspectorOpen(true);
  };

  const handleAutoLaunchInspector = async (url: string) => {
    try {
      const resp = await fetch(API_ENDPOINTS.INSPECTOR_START, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (resp.ok) {
        addToast('success', 'Browser launched automatically.');
        // Ensure the modal opens so the user can see the live session
        setIsInspectorOpen(true);
      } else {
        throw new Error('Launch failed');
      }
    } catch (err) {
      console.error('Auto-launch failed:', err);
      addToast('error', 'Browser auto-launch failed.');
      throw err;
    }
  };

  // Extract context URL from the first open_page block
  const getContextUrl = (): string | undefined => {
    if (!currentFlow) return undefined;
    const openPageBlock = currentFlow.blocks.find((b: FlowBlock) => b.type === 'open_page');
    return openPageBlock?.url;
  };


  return (
    <div className="flex flex-col h-screen w-full bg-black text-gray-200 font-sans overflow-hidden">
      {/* Top Bar - Professional / Minimalist */}
      <header className="flex-none h-14 border-b border-gray-800 bg-black z-50">
        <div className="flex h-full items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-md overflow-hidden">
              <img src="/logo-no-bg.png" alt="WebLens" className="w-full h-full object-contain shadow-sm" />
            </div>
            <h1 className="text-sm font-black tracking-[0.2em] text-white uppercase">
              {isViewerMode ? 'Report Viewer' : 'WebLens'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {!isViewerMode && (
              <>
                {/* File / Management Group */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowOnboarding(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all active:scale-95 group shadow-lg"
                    title="Templates & Help"
                  >
                    <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Library</span>
                  </button>

                  <button 
                    onClick={handleNewFlow}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-white text-black hover:bg-zinc-200 transition-all active:scale-95 group"
                    title="Start Fresh"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-wider">New Flow</span>
                  </button>

                  <FlowMenu 
                    onExport={(format) => blockEditorRef.current?.exportFlow(format)}
                    onImport={() => blockEditorRef.current?.triggerImport()}
                  />
                </div>

                <div className="h-6 w-[1px] bg-white/10" />

                {/* Environment Group */}
                <div className="flex items-center gap-2">
                    <CustomDropdown 
                      options={[
                        { value: '', label: 'Local Browser' },
                        ...environments.map(env => ({ value: env.id, label: env.name }))
                      ]}
                      value={selectedEnvironmentId}
                      onChange={setSelectedEnvironmentId}
                      icon={<Globe className="w-3.5 h-3.5" />}
                    />
                    
                    <button 
                      onClick={() => setIsEnvManagerOpen(true)}
                      className="p-2 bg-white/5 border border-white/5 rounded-lg text-zinc-600 hover:text-white hover:border-white/20 transition-all"
                      title="Manage Environments"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="h-6 w-[1px] bg-white/10" />

                {/* Execution Group */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 shadow-inner w-[140px]">
                    <div className={`w-1.5 h-1.5 rounded-full flex-none ${isRunning ? 'bg-white animate-pulse' : 'bg-zinc-600'}`} />
                    <span className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 truncate">
                      {isRunning ? 'Execution Active' : 'Ready'}
                    </span>
                  </div>

                  {/* Save Status Indicator */}
                  {currentFlow && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 shadow-inner min-w-[100px] transition-all duration-300">
                          <div className={clsx(
                              "w-1.5 h-1.5 rounded-full",
                              saveStatus === 'saved' ? "bg-emerald-500" : 
                              saveStatus === 'saving' ? "bg-amber-500 animate-pulse" : 
                              "bg-zinc-700"
                          )} />
                          <span className="text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 transition-colors">
                              {saveStatus === 'saved' ? 'Synced' : 
                               saveStatus === 'saving' ? 'Syncing...' : 
                               'Unsaved'}
                          </span>
                      </div>
                  )}

                  <button 
                    onClick={runTest}
                    disabled={isRunning || !currentFlow}
                    className={`
                      flex items-center justify-center gap-2 px-5 py-1.5 rounded-md text-[10px] font-black uppercase tracking-[0.2em] transition-all border w-[140px]
                      ${isRunning || !currentFlow
                        ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed shadow-none' 
                        : 'bg-white border-white text-black hover:bg-zinc-200 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                      }
                    `}
                  >
                     {isRunning ? (
                         <Loader2 className="w-3.5 h-3.5 animate-spin" />
                     ) : (
                         <Play className="w-3.5 h-3.5 fill-current" />
                     )}
                     {isRunning ? 'Running...' : 'Run Flow'}
                  </button>

                  {!isExplorerOpen && (
                    <button 
                      onClick={() => setIsExplorerOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-zinc-200 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)] border border-white"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                       {executionReport ? 'Review Evidence' : 'Live Stream'}
                    </button>
                  )}
                </div>

                <div className="h-6 w-[1px] bg-white/10" />

                {/* Profile Group */}
                <button 
                  onClick={() => setView('settings')}
                  className={`border rounded-lg transition-all flex items-center justify-center overflow-hidden ${view === 'settings' ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-zinc-600 hover:text-white hover:border-white/20'}`}
                  title="Profile & Settings"
                >
                  {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
                    <img 
                      src={user.user_metadata.avatar_url || user.user_metadata.picture} 
                      alt="Profile" 
                      className="w-8 h-8 rounded object-cover" 
                    />
                  ) : (
                    <User className="w-3.5 h-3.5" />
                  )}
                </button>
              </>
            )}
            
            {isViewerMode && (
              <button 
                onClick={() => {
                  window.location.href = window.location.pathname;
                }}
                className="flex items-center gap-2 px-4 py-2 rounded bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-white/10 active:scale-95 shadow-lg"
              >
                <Layers className="w-3.5 h-3.5" />
                Back to Editor
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col relative">
        {view === 'settings' ? (
             <div className="flex-1 overflow-auto">
                 {/* Back Button */}
                 <div className="absolute top-6 left-6 z-50">
                    <button onClick={() => setView('editor')} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">
                       &larr; Back to Editor
                    </button>
                 </div>
                 <Settings />
             </div>
        ) : (
            <div className={clsx("flex-1 overflow-hidden h-full", isViewerMode && "hidden")}>
                <FlowEditor 
                ref={blockEditorRef}
                onFlowChange={setCurrentFlow}
                onSaveStatusChange={setSaveStatus}
                onValidationError={(errors) => {
                    if (errors.length > 0) console.warn('Errors:', errors);
                }}
                onRequestPick={handleStartPicking}
                onAutoLaunch={handleAutoLaunchInspector}
                highlightBlockId={selectedBlockId}
                onBlockClick={(id) => setSelectedBlockId(id)}
                showOnboarding={showOnboarding}
                setShowOnboarding={setShowOnboarding}
                environments={environments}
                selectedEnvironmentId={selectedEnvironmentId}
                onViewScenario={(runId) => {
                    fetchExecutionReport(runId);
                    setIsExplorerOpen(true);
                    setExplorerHeight(400); // Automatically uncollapse
                }}
                lastReport={executionReport}
                externalVariables={environments.find(e => e.id === selectedEnvironmentId)?.variables ? 
                  Object.entries(environments.find(e => e.id === selectedEnvironmentId)!.variables).map(([k, _]) => ({ key: k, label: k })) : 
                  []
                }
                />
            </div>
        )}

        {/* Compact Status Indicator (During Runtime) */}
        {isRunning && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3 px-5 py-2.5 bg-black/90 backdrop-blur-3xl border border-white/20 rounded-full shadow-[0_0_40px_rgba(255,255,255,0.08)]">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span className="text-[10px] font-black tracking-[0.25em] text-white uppercase">Live Execution</span>
                    </div>
                    <div className="h-4 w-[1px] bg-white/10" />
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                        {events.length > 0 ? events[events.length - 1].message : 'Initializing...'}
                    </span>
                </div>
            </div>
        )}

        {/* Unified Error Banner */}
        {error && !isExplorerOpen && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-xl px-4">
                <div className="flex items-center justify-between p-5 bg-black/95 backdrop-blur-2xl border-l-[3px] border-white rounded-r-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5">
                   <div className="flex items-center gap-5">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                          <AlertTriangle className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white mb-1">Execution Failure</h4>
                        <p className="text-[11px] text-zinc-400 line-clamp-1 font-medium italic opacity-85 underline decoration-white/20">{error.message}</p>
                      </div>
                   </div>
                   <button 
                    onClick={() => {
                        setIsExplorerOpen(true);
                        if (error.relatedBlockId) setSelectedBlockId(error.relatedBlockId);
                    }}
                    className="px-5 py-2.5 bg-white text-black rounded text-[10px] font-black uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all flex-none shadow-[0_4px_15px_rgba(255,255,255,0.1)] active:scale-95 border border-white"
                   >
                     Review Evidence
                   </button>
                </div>
            </div>
        )}

        {/* Execution Explorer (Bottom Panel) */}
        <div 
          style={{ height: isExplorerOpen ? (explorerHeight < 40 ? 40 : explorerHeight) + 'px' : '0px' }}
          className={`border-t border-zinc-900 shadow-2xl z-[150] bg-black flex flex-col relative transition-all duration-300 ${isResizing ? 'transition-none' : ''} ${!isExplorerOpen ? 'opacity-0 pointer-events-none translate-y-full' : 'opacity-100'}`}
        >
          {/* Floating Restore Button (Visible when closed) */}
          {!isExplorerOpen && (
              <button 
                onClick={() => setIsExplorerOpen(true)}
                className="absolute -top-14 right-6 p-3 bg-white text-black rounded-full shadow-2xl border border-white hover:scale-110 active:scale-95 transition-all z-50 group pointer-events-auto"
                title="Restore Monitor"
              >
                <Terminal className="w-5 h-5" />
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10">Restore Monitor</span>
              </button>
          )}

          {/* Resizer Handle */}
          <div 
              onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizing(true);
              }}
              className={`absolute -top-0.5 left-0 right-0 h-1 cursor-row-resize z-50 transition-colors ${isResizing ? 'bg-white' : 'hover:bg-white/50'}`}
              title="Resize Explorer"
          />

          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-900 bg-black flex-none h-10">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-white opacity-20" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">System Monitor</span>
            </div>
            <div className="flex items-center gap-1">
                <button 
                  onClick={() => {
                      if (explorerHeight < 80) setExplorerHeight(320);
                      else setExplorerHeight(40);
                  }}
                  className="p-1.5 rounded text-zinc-600 hover:text-white hover:bg-white/5 transition-all"
                  title={explorerHeight < 80 ? "Restore Height" : "Minimize"}
                >
                  <svg 
                    className={`w-4 h-4 transition-transform duration-300 ${explorerHeight < 80 ? "rotate-180" : ""}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button 
                  onClick={() => setIsExplorerOpen(false)}
                  className="p-1.5 rounded text-zinc-600 hover:text-white hover:bg-white/5 transition-all ml-1"
                  title="Close Monitor"
                >
                  <X className="w-4 h-4" />
                </button>
            </div>
          </div>
          <div className={`flex-1 overflow-hidden bg-black transition-opacity duration-300 ${explorerHeight < 80 ? 'opacity-0' : 'opacity-100'}`}>
              <ExecutionExplorer 
                  report={executionReport} 
                  selectedBlockId={selectedBlockId}
                  onBlockSelect={(id) => setSelectedBlockId(id)}
                  onClose={() => setIsExplorerOpen(false)}
              />
          </div>
        </div>

        {/* Global Resize Overlay */}
        {isResizing && (
            <div className="fixed inset-0 z-[9999] cursor-row-resize" />
        )}
      </main>

      {/* Inspector Modal */}
      <InspectorModal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        onElementPicked={handleElementPicked}
        contextUrl={getContextUrl()}
        blockType={activePickingBlockType}
      />

      <EnvironmentManager 
        isOpen={isEnvManagerOpen}
        onClose={() => setIsEnvManagerOpen(false)}
        environments={environments}
        isLoading={isLoadingEnvs}
        onAdd={handleAddEnvironment}
        onDelete={handleDeleteEnvironment}
      />

    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    
    // PUBLIC ACCESS: Allow viewing shared reports without login
    const params = new URLSearchParams(window.location.search);
    const isSharedReport = params.has('report');

    if (loading) return (
        <div className="h-screen bg-black flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Authenticating</p>
        </div>
    );

    if (!user && !isSharedReport) return <Login />;
    
    return <>{children}</>;
}


export default function App() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024); // Tablet/Mobile check (iPad Mini is ~768px, generic tablet ~1024px)
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    if (isMobile) {
        return <MobileRestricted />;
    }

    return (
        <AuthProvider>
            <ToastProvider>
                <AuthGuard>
                    <Dashboard />
                </AuthGuard>
            </ToastProvider>
        </AuthProvider>
    );
}
