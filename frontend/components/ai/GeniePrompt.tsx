import React, { useState, useMemo } from 'react';
import { Sparkles, Wand2, Loader2, X, Send } from 'lucide-react';
import { API_ENDPOINTS } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { VariableInput } from '../VariableInput';
import { VariableTextarea } from '../VariableTextarea';

interface GeniePromptProps {
    onFlowGenerated: (flow: any) => void;
    addToast: (type: 'success' | 'error' | 'info', message: string) => void;
    isSidePanel?: boolean;
    variables?: Record<string, string>;
    onClose?: () => void;
}

interface GenieMessage {
    role: 'user' | 'assistant';
    content: string;
    flow?: any;
}

export const GeniePrompt: React.FC<GeniePromptProps> = ({ onFlowGenerated, addToast, isSidePanel, variables = {}, onClose }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [intent, setIntent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [messages, setMessages] = useState<GenieMessage[]>([]);
    const [previewFlow, setPreviewFlow] = useState<any | null>(null);
    const { session } = useAuth();

    // Convert variables object to savedValues format
    const savedValues = useMemo(() => {
        return Object.keys(variables).map(key => ({
            key,
            label: variables[key]
        }));
    }, [variables]);

    const handleGenerate = async () => {
        const currentIntent = intent.trim();
        if (!currentIntent) return;

        setIsGenerating(true);
        // Add user message to history
        const newUserMessage: GenieMessage = { role: 'user', content: currentIntent };
        setMessages(prev => [...prev, newUserMessage]);
        setIntent('');

        try {
            const token = session?.access_token;
            const resp = await fetch(`${API_ENDPOINTS.BASE_URL}/api/ai/generate-flow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ 
                    intent: currentIntent,
                    history: messages.map(m => ({ role: m.role, content: m.content })),
                    variables
                })
            });

            if (resp.ok) {
                const result = await resp.json();
                
                if (result.blocks) {
                    // It's a flow
                    const assistantMsg: GenieMessage = { 
                        role: 'assistant', 
                        content: `I've architected a flow: "${result.name}". Review the blocks below.`,
                        flow: result 
                    };
                    setMessages(prev => [...prev, assistantMsg]);
                    setPreviewFlow(result);
                } else if (result.message) {
                    // Just text
                    const assistantMsg: GenieMessage = { 
                        role: 'assistant', 
                        content: result.message 
                    };
                    setMessages(prev => [...prev, assistantMsg]);
                } else {
                    addToast('info', 'Genie processed your request but didn\'t return a flow.');
                }
            } else {
                const error = await resp.json();
                addToast('error', error.detail || 'The Genie is exhausted. Try again later.');
            }
        } catch (err) {
            addToast('error', 'Magic failed. Check your connection.');
        } finally {
            setIsGenerating(false);
        }
    };

    const addToFlow = () => {
        if (previewFlow) {
            onFlowGenerated(previewFlow);
            addToast('success', 'Blocks added to your flow!');
            setPreviewFlow(null);
        }
    };

    const clearHistory = () => {
        setMessages([]);
        setPreviewFlow(null);
        addToast('info', 'Genie\'s memory has been cleared.');
    };

    if (isSidePanel) {
        return (
            <div className="flex flex-col h-full space-y-4 overflow-hidden">
                <div className="flex items-center justify-between px-6 pt-6 flex-none">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Genie Architect</h4>
                    </div>
                    {messages.length > 0 && (
                        <button 
                            onClick={clearHistory}
                            className="text-[8px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                        >
                            Clear Chat
                        </button>
                    )}
                    {onClose && (
                        <button 
                            onClick={onClose}
                            className="p-1.5 rounded hover:bg-white/5 text-zinc-600 hover:text-white transition-all"
                            title="Close Genie"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Chat History */}
                <div className="flex-1 overflow-y-auto px-6 space-y-5 scrollbar-hide py-2">
                    {messages.length === 0 && (
                        <div className="py-8 space-y-6">
                            <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 space-y-3">
                                <p className="text-[11px] text-zinc-400 leading-relaxed font-medium italic">
                                    "Greetings, Master. I am the Genie. Describe the journey you wish to test, and I shall architect the blocks for you."
                                </p>
                            </div>
                            
                            <div className="space-y-3">
                                <h5 className="text-[8px] font-black uppercase tracking-[0.15em] text-zinc-600 px-1">Try suggesting</h5>
                                <div className="grid gap-2">
                                    {[
                                        "Login to example.com and check profile",
                                        "Search for 'WebLens' and click first result",
                                        "Add product to cart and verify modal"
                                    ].map((s, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => setIntent(s)}
                                            className="text-left p-3 rounded-lg border border-white/5 bg-zinc-950/50 hover:bg-zinc-900 transition-all text-[10px] text-zinc-400 font-medium group active:scale-[0.98]"
                                        >
                                            <span className="group-hover:text-purple-400 transition-colors">{s}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-2`}>
                            <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-[11px] font-medium leading-relaxed shadow-sm ${
                                msg.role === 'user' 
                                    ? 'bg-white text-black rounded-tr-none' 
                                    : 'bg-zinc-900 text-zinc-300 border border-white/5 rounded-tl-none'
                            }`}>
                                {msg.content.split(/(\{\{[^}]+\}\})/).map((part, partIndex) => {
                                    if (part.startsWith('{{') && part.endsWith('}}')) {
                                        return (
                                            <span key={partIndex} className={`${
                                                msg.role === 'user' ? 'text-indigo-600' : 'text-indigo-400'
                                            } font-semibold`}>
                                                {part}
                                            </span>
                                        );
                                    }
                                    return <span key={partIndex}>{part}</span>;
                                })}
                            </div>
                            {msg.flow && (
                                <div className="w-full mt-2 bg-zinc-950/80 border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border-l-indigo-500/50 border-l-2">
                                    <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
                                            <span className="text-[10px] font-bold text-white tracking-widest uppercase">Blueprint: {msg.flow.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 p-1 px-2 rounded-full bg-black/40 border border-white/5">
                                            <div className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
                                            <span className="text-[8px] text-zinc-400 font-black uppercase">{msg.flow.blocks.length} Steps</span>
                                        </div>
                                    </div>
                                    <div className="p-3 space-y-1.5 max-h-[300px] overflow-y-auto scrollbar-hide bg-black/20">
                                        {msg.flow.blocks.map((b: any, bi: number) => (
                                            <div key={b.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-900/30 border border-white/5 group hover:bg-white/5 transition-colors">
                                                <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center text-[9px] font-black text-zinc-500 border border-white/5 group-hover:border-indigo-500/30 group-hover:text-indigo-400 transition-colors">
                                                    {bi + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-[10px] font-black text-white uppercase tracking-wider truncate">
                                                            {b.type.replace(/_/g, ' ')}
                                                        </div>
                                                        {b.next_block && (
                                                            <div className="w-2 h-2 rounded-full bg-zinc-800 flex items-center justify-center">
                                                                <div className="w-0.5 h-0.5 rounded-full bg-zinc-600" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-[9px] text-zinc-500 truncate font-medium mt-0.5">
                                                        {b.url || b.element?.name || b.text || 'System operation'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-4 bg-white/5 border-t border-white/5">
                                        <button 
                                            onClick={addToFlow}
                                            className="w-full flex items-center justify-center gap-2.5 py-3 bg-white text-black hover:bg-zinc-200 rounded-lg text-[10px] font-black uppercase tracking-[0.25em] transition-all active:scale-[0.97] shadow-lg shadow-white/5"
                                        >
                                            <Sparkles className="w-3.5 h-3.5" />
                                            Add to Flow Canvas
                                        </button>
                                        <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest text-center mt-3">
                                            Human Verification Required
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {isGenerating && (
                        <div className="flex items-start">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-3 shadow-sm">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                                <span className="text-[10px] text-zinc-500 font-medium italic">Architecting...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="px-6 pb-6 pt-2 flex-none">
                    <div className="relative group">
                        <div className="relative flex flex-col bg-zinc-950 border border-white/10 rounded-xl p-3 shadow-2xl focus-within:border-white/20 transition-all duration-300">
                            <VariableTextarea 
                                autoFocus
                                value={intent}
                                onChange={setIntent}
                                savedValues={savedValues}
                                placeholder="State your intent, Master..."
                                className="bg-transparent border-none outline-none text-[11px] text-white placeholder-zinc-700 w-full min-h-[60px] max-h-[150px] resize-none mb-2 font-medium leading-relaxed scrollbar-hide"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleGenerate();
                                    }
                                }}
                                disabled={isGenerating}
                            />
                            <div className="flex items-center justify-between border-t border-white/5 pt-3">
                                <div className="flex items-center gap-1.5 p-1 px-2 rounded-full bg-black/40 border border-white/5">
                                    <div className={`w-1 h-1 rounded-full ${isGenerating ? 'bg-purple-500 animate-pulse' : 'bg-green-500'}`} />
                                    <span className="text-[7px] font-black uppercase tracking-[0.2em] text-zinc-500">
                                        {isGenerating ? 'Working' : 'Ready'}
                                    </span>
                                </div>
                                <button 
                                    onClick={handleGenerate}
                                    disabled={isGenerating || !intent.trim()}
                                    className="flex items-center justify-center w-8 h-8 bg-white text-black rounded-lg hover:bg-zinc-200 transition-all disabled:opacity-10 disabled:grayscale active:scale-90 shadow-xl"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900 border border-purple-500/30 text-purple-400 hover:text-white hover:bg-purple-500/10 transition-all active:scale-95 group"
                title="Ask the Genie"
            >
                <Wand2 className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-wider">Ask Genie</span>
            </button>
        );
    }

    return (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="relative group">
                <div className="relative flex items-center bg-black border border-white/10 rounded-lg px-3 py-1.5 min-w-[300px] shadow-2xl">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 mr-2 flex-none" />
                    <VariableInput 
                        autoFocus
                        value={intent}
                        onChange={setIntent}
                        savedValues={savedValues}
                        placeholder="Describe your test (e.g. 'Login and verify profile')..."
                        className="bg-transparent border-none outline-none text-[10px] text-white placeholder-zinc-500 w-full"
                        disabled={isGenerating}
                    />
                    <div className="flex items-center gap-1 ml-2">
                        <button 
                            onClick={handleGenerate}
                            disabled={isGenerating || !intent.trim()}
                            className="p-1 hover:bg-white/5 rounded text-zinc-400 hover:text-white transition-colors disabled:opacity-30"
                        >
                            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        </button>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-white/5 rounded text-zinc-600 hover:text-white transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
