import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, Send, X, ChevronDown, ChevronUp, Check, Plus, Trash2, Loader2 } from 'lucide-react';
import { API_ENDPOINTS } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { VariableTextarea } from '../VariableTextarea';
import { ConfirmationDialog } from '../ConfirmationDialog';

interface GeniePromptProps {
    onFlowGenerated: (flow: any) => void;
    addToast: (type: 'success' | 'error' | 'info', message: string) => void;
    isSidePanel?: boolean;
    variables?: Record<string, string>;
    onClose?: () => void;
    chatHistory?: any;
    onChatUpdate?: (chatHistory: any) => void;
    currentFlow?: any;
    onRequestPick?: (blockType: string, callback: (element: any) => void) => void;
    onAutoLaunch?: (url: string) => Promise<void>;
}

interface GenieMessage {
    role: 'user' | 'assistant';
    content: string;
    flow?: any;
    mode?: 'ask' | 'build';
}

const FlowPreviewCard: React.FC<{
    flow: any;
    onAdd: () => void;
    onDiscard?: () => void;
}> = ({ flow, onAdd, onDiscard }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isAdded, setIsAdded] = useState(false);

    const handleAdd = () => {
        onAdd();
        setIsAdded(true);
        setTimeout(() => setIsAdded(false), 2000);
    };

    return (
        <div className="mt-3 mb-1 rounded-xl bg-black/40 border border-white/10 overflow-hidden group/card transition-all hover:border-white/20">
            {/* Header */}
            <div 
                className="flex items-center justify-between p-3 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                        <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-zinc-200">Generated Flow</div>
                        <div className="text-[10px] text-zinc-500 font-medium">
                            {flow.blocks?.length || 0} Steps • {flow.name || 'Untitled'}
                        </div>
                    </div>
                </div>
                <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="p-2 space-y-1 bg-black/20 border-t border-white/5 max-h-[200px] overflow-y-auto custom-scrollbar">
                    {flow.blocks?.map((block: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5">
                            <span className="text-[10px] font-mono text-zinc-600 w-4">#{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-medium text-zinc-300 truncate">
                                    {block.label || block.type.replace('_', ' ')}
                                </div>
                                {block.params && Object.keys(block.params).length > 0 && (
                                    <div className="text-[9px] text-zinc-600 truncate">
                                        {Object.values(block.params).join(', ')}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Actions */}
            <div className="p-2 border-t border-white/5 flex gap-2 bg-white/[0.01]">
                <button 
                    onClick={(e) => { e.stopPropagation(); handleAdd(); }}
                    disabled={isAdded}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-400 text-[11px] font-bold transition-all active:scale-[0.98]"
                >
                    {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {isAdded ? 'Added' : 'Add to Editor'}
                </button>
                {onDiscard && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDiscard(); }}
                        className="px-3 py-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 text-[11px] font-medium transition-all active:scale-[0.98]"
                        title="Dismiss"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
};

export const GeniePrompt: React.FC<GeniePromptProps> = ({ 
    onFlowGenerated, 
    addToast, 
    isSidePanel, 
    variables = {}, 
    onClose,
    chatHistory,
    onChatUpdate,
    currentFlow,
    onRequestPick,
    onAutoLaunch
}) => {
    const [intent, setIntent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [mode, setMode] = useState<'ask' | 'build'>('build');
    const [messages, setMessages] = useState<GenieMessage[]>([]);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const { session } = useAuth();
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Load chat history from database on mount
    useEffect(() => {
        if (chatHistory && chatHistory.messages) {
            setMessages(chatHistory.messages);
        }
    }, [chatHistory]);

    // Save messages to database when they change
    useEffect(() => {
        if (messages.length > 0 && onChatUpdate) {
            onChatUpdate({ messages, mode });
        }
    }, [messages, mode, onChatUpdate]);

    // Convert variables object to savedValues format
    const savedValues = useMemo(() => {
        return Object.keys(variables).map(key => ({
            key,
            label: variables[key]
        }));
    }, [variables]);

    // Auto-scroll to bottom when messages change or when generating
    useEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages, isGenerating]);

    const handleGenerate = async (overrideElement?: any) => {
        const currentIntent = intent.trim();
        if (!currentIntent && !overrideElement) return;

        setIsGenerating(true);
        
        // Add user message to history only if it's the first attempt (not a re-submit with element)
        if (!overrideElement) {
            const newUserMessage: GenieMessage = { role: 'user', content: currentIntent, mode };
            setMessages(prev => [...prev, newUserMessage]);
        }
        
        // CHECK FOR @verify COMMAND: REMOVED (Now handled intelligently by AI)
        let augmentedIntent = currentIntent;
        let pickedElement = overrideElement || null;

        // Clear intent if we are starting a fresh request
        if (!overrideElement) {
            setIntent('');
        }

        // --- AI Autonomous Context Scraping ---
        let interactionMap = null;
        try {
            const mapResp = await fetch(`${API_ENDPOINTS.BASE_URL}/api/ai/scrape-interactions`);
            if (mapResp.ok) {
                const mapData = await mapResp.json();
                if (mapData.status === 'success') {
                    interactionMap = mapData;
                }
            }
        } catch (e) {
            // Ignore, inspector likely not running
        }

        try {
            const token = session?.access_token;
            const requestBody: any = { 
                intent: augmentedIntent,
                mode: mode,
                history: messages
                    .filter(m => (m.mode === mode) || (!m.mode && mode === 'build'))
                    .map(m => ({ role: m.role, content: m.content })),
                variables,
                currentFlow: currentFlow,
                interactionMap: interactionMap // New Context
            };

            if (pickedElement) {
                requestBody.pickedElement = pickedElement;
            }

            const resp = await fetch(`${API_ENDPOINTS.BASE_URL}/api/ai/generate-flow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(requestBody)
            });
            if (resp.ok) {
                const result = await resp.json();
                
                // IF AI NEEDS TO START BROWSER
                if (result.action === 'start_inspector' && onAutoLaunch) {
                    setMessages(prev => [...prev, { 
                        role: 'assistant', 
                        content: result.message || "I'm launching the browser to see the page...",
                        mode 
                    }]);
                    
                    try {
                        await onAutoLaunch(result.url);
                        setIsGenerating(false);
                        return;
                    } catch (err) {
                        addToast('error', 'Failed to auto-launch browser.');
                        setIsGenerating(false);
                        return;
                    }
                }

                if (result.action === 'pick_element' && onRequestPick) {
                    // Show assistant's request
                    setMessages(prev => [...prev, { 
                        role: 'assistant', 
                        content: result.message || "Please select the element you're referring to.",
                        mode 
                    }]);

                    // Trigger Inspector
                    try {
                        const element = await new Promise<any>((resolve, reject) => {
                            onRequestPick('verify_text', (el) => {
                                if (el) resolve(el);
                                else reject("cancelled");
                            });
                        });

                        if (element) {
                            // Automatically re-submit with context
                            // We don't clear isGenerating yet, we just chain the next call
                            return handleGenerate(element);
                        }
                    } catch (err) {
                        console.error("Picking cancelled", err);
                        setIsGenerating(false);
                        return;
                    }
                }

                if (result.blocks && result.blocks.length > 0) {
                    // It's a flow
                    const assistantMsg: GenieMessage = { 
                        role: 'assistant', 
                        content: result.name ? `I've created a flow: "${result.name}". Review the blocks below.` : "I've generated the automation blocks for you.",
                        flow: result,
                        mode
                    };
                    setMessages(prev => [...prev, assistantMsg]);

                } else if (result.message) {
                    // Just text
                    const assistantMsg: GenieMessage = { 
                        role: 'assistant', 
                        content: result.message,
                        mode 
                    };
                    setMessages(prev => [...prev, assistantMsg]);
                } else {
                    addToast('info', 'AI processed your request but didn\'t return a flow.');
                }
            } else {
                const error = await resp.json();
                addToast('error', error.detail || 'The AI is exhausted. Try again later.');
            }
        } catch (err) {
            addToast('error', 'Magic failed. Check your connection.');
        } finally {
            setIsGenerating(false);
        }
    };



    if (isSidePanel) {
        return (
            <div className="flex flex-col h-full bg-zinc-950 border-l border-white/5 relative">
                {/* Ambient Background Gradient */}
                <div className="absolute inset-0 pointer-events-none" />

                {/* Header */}
                <div className="relative flex items-center justify-between px-4 py-4 border-b border-white/5 bg-zinc-900/30 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                        <span className="text-sm font-bold text-zinc-100 tracking-wide">WebLens AI</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {messages.length > 0 && (
                            <button 
                                onClick={() => setShowClearConfirm(true)}
                                className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 hover:text-rose-400 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                            >
                                Clear
                            </button>
                        )}
                        {onClose && (
                            <button 
                                onClick={onClose}
                                className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-500 hover:text-white transition-all active:scale-95"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Messages */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-8 relative z-0 scrollbar-hide">
                    {messages.length === 0 && (
                        <div className="flex flex-col h-full justify-center px-2 animate-in fade-in zoom-in-95 duration-500">
                            <div className="space-y-8">
                                <div className="space-y-2 text-center">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(99,102,241,0.1)]">
                                        <Sparkles className="w-6 h-6 text-indigo-400" />
                                    </div>
                                    <h3 className="text-base font-bold text-white tracking-tight">
                                        {mode === 'ask' ? 'Ask WebLens' : 'Build Flows'}
                                    </h3>
                                    <p className="text-xs text-zinc-400 max-w-[200px] mx-auto leading-relaxed">
                                        {mode === 'ask' 
                                            ? 'Your expert consultant for reliable test automation.' 
                                            : 'Describe your test case and I\'ll build the automation blocks.'}
                                    </p>
                                </div>
                                
                                <div className="space-y-3">
                                    <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-[0.2em] text-center">Try Asking</p>
                                    <div className="grid grid-cols-1 gap-2">
                                    {mode === 'ask' ? (
                                        <>
                                            <button 
                                                onClick={() => setIntent("How do I handle dynamic elements?")}
                                                className="group w-full text-left p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/[0.02] transition-all active:scale-[0.99]"
                                            >
                                                <div className="text-xs font-medium text-zinc-300 group-hover:text-indigo-300 transition-colors">Handle dynamic elements</div>
                                            </button>
                                            <button 
                                                onClick={() => setIntent("Best practices for API testing?")}
                                                className="group w-full text-left p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/[0.02] transition-all active:scale-[0.99]"
                                            >
                                                <div className="text-xs font-medium text-zinc-300 group-hover:text-indigo-300 transition-colors">API testing guide</div>
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button 
                                                onClick={() => setIntent("Login to app.com with user/pass")}
                                                className="group w-full text-left p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/[0.02] transition-all active:scale-[0.99]"
                                            >
                                                <div className="text-xs font-medium text-zinc-300 group-hover:text-indigo-300 transition-colors">Login flow</div>
                                                <div className="text-[10px] text-zinc-600 mt-1">Use variables like {'{{username}}'}</div>
                                            </button>
                                            <button 
                                                onClick={() => setIntent("@verify the dashboard text is visible")}
                                                className="group w-full text-left p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/[0.02] transition-all active:scale-[0.99]"
                                            >
                                                <div className="text-xs font-medium text-zinc-300 group-hover:text-indigo-300 transition-colors">Verify UI text</div>
                                                <div className="text-[10px] text-zinc-600 mt-1">Check assertions on the page</div>
                                            </button>
                                        </>
                                    )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {messages
                        .filter(msg => (msg.mode === mode) || (!msg.mode && mode === 'build'))
                        .map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards`} style={{ animationDelay: `${i * 50}ms` }}>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-lg ${
                                msg.role === 'user' 
                                    ? 'bg-white text-black rounded-tr-sm' 
                                    : 'bg-zinc-900 border border-white/10 text-zinc-200 rounded-tl-sm shadow-black/20'
                            }`}>
                                <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
                                    <ReactMarkdown 
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            h1: ({node, ...props}) => <h1 className="text-base font-bold text-white mb-2 mt-2" {...props} />,
                                            h2: ({node, ...props}) => <h2 className="text-sm font-bold text-zinc-100 mb-2 mt-2" {...props} />,
                                            h3: ({node, ...props}) => <h3 className="text-xs font-bold text-zinc-200 mb-1 mt-1" {...props} />,
                                            p: ({node, ...props}) => <p className="text-sm leading-relaxed mb-2 last:mb-0" {...props} />,
                                            ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1 mb-2" {...props} />,
                                            ol: ({node, ...props}) => <ol className="list-decimal pl-4 space-y-1 mb-2" {...props} />,
                                            li: ({node, ...props}) => <li className="text-sm" {...props} />,
                                            code: ({node, inline, className, children, ...props}: any) => {
                                                const match = /language-(\w+)/.exec(className || '')
                                                const content = String(children).replace(/\n$/, '')
                                                const isVariable = content.startsWith('{{') && content.endsWith('}}');
                                                
                                                if (isVariable) {
                                                    return (
                                                        <span className="text-indigo-400 font-semibold bg-indigo-500/10 px-1 rounded">
                                                            {content}
                                                        </span>
                                                    )
                                                }
                                                return !inline && match ? (
                                                    <code className={className} {...props}>
                                                        {children}
                                                    </code>
                                                ) : (
                                                    <code className="bg-white/10 rounded px-1.5 py-0.5 text-zinc-200 text-xs font-mono" {...props}>
                                                        {children}
                                                    </code>
                                                )
                                            }
                                        }}
                                    >
                                        {msg.content.replace(/{{(.*?)}}/g, '`{{$1}}`')}
                                    </ReactMarkdown>
                                </div>
                                
                                {msg.flow && (
                                    <FlowPreviewCard 
                                        flow={msg.flow} 
                                        onAdd={() => onFlowGenerated(msg.flow)}
                                        onDiscard={() => {
                                            setMessages(prev => prev.map((m, idx) => idx === i ? { ...m, flow: undefined } : m));
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Typing Indicator */}
                    {isGenerating && (
                        <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-zinc-900 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 shadow-lg">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 pt-0 bg-zinc-950 relative z-10">
                    <div className="relative group">
                        <div className="absolute inset-0 rounded-2xl" />
                        <div className="relative bg-zinc-900 border border-white/10 rounded-2xl flex items-end p-2 transition-colors group-focus-within:border-white/20 group-focus-within:bg-zinc-900/80">
                            <VariableTextarea 
                                value={intent}
                                onChange={setIntent}
                                onKeyDown={(e) => {
                                    // Fix: IME Composition Guard
                                    if (e.nativeEvent.isComposing) return;
                                    
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        // Fix: Guard against double-send or empty send
                                        if (!isGenerating && intent.trim()) {
                                            handleGenerate();
                                        }
                                    }
                                }}
                                savedValues={savedValues}
                                placeholder={mode === 'build' ? "Describe flow (e.g. 'Login with user')..." : "Ask about testing..."}
                                className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-zinc-600 resize-none overflow-hidden min-h-[44px] max-h-[120px] py-2.5 px-3"
                            />
                            <button 
                                onClick={handleGenerate}
                                disabled={isGenerating || !intent.trim()}
                                className="w-9 h-9 rounded-xl bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-black flex items-center justify-center transition-all mb-[2px] shadow-sm transform active:scale-95 disabled:active:scale-100"
                            >
                                 {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 px-1">
                        <div className="flex items-center gap-1 bg-zinc-900 border border-white/10 rounded-lg p-0.5 shadow-sm">
                            <button
                                onClick={() => setMode('ask')}
                                className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${
                                    mode === 'ask' 
                                        ? 'bg-indigo-500 text-white shadow-sm' 
                                        : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                Ask
                            </button>
                            <button
                                onClick={() => setMode('build')}
                                className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${
                                    mode === 'build' 
                                        ? 'bg-white text-black shadow-sm' 
                                        : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                Build
                            </button>
                        </div>

                        <div className="text-[10px] text-zinc-600 font-medium">
                            Enter to send • Shift+Enter for new line
                        </div>
                    </div>
                </div>

                <ConfirmationDialog 
                    isOpen={showClearConfirm}
                    title="Clear Chat History"
                    message="Are you sure you want to clear the chat history? This action cannot be undone."
                    confirmLabel="Clear History"
                    isDestructive={true}
                    onConfirm={() => {
                        setMessages([]);
                        setShowClearConfirm(false);
                    }}
                    onCancel={() => setShowClearConfirm(false)}
                />
            </div>
        );
    }

    return null;
};
