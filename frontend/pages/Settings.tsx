import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Shield, Clock, LogOut, Cpu, Key, Server, Save, ChevronDown, Check } from 'lucide-react';
import { Skeleton } from '../components/Skeleton';
import { api } from '../lib/api';
import { API_ENDPOINTS } from '../config/api';

export default function Settings() {
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState({ flows: 0, executions: 0, screenshots: 0 });
  const [loading, setLoading] = useState(true);

  // AI Config State
  const [aiConfig, setAiConfig] = useState({
      provider: 'gemini',
      apiKey: '',
      model: '',
      baseUrl: ''
  });

  // Extract metadata safely
  const metadata = user?.user_metadata || {};
  const avatarUrl = metadata.avatar_url || metadata.picture;
  const fullName = metadata.full_name || metadata.name;
  const provider = user?.app_metadata?.provider || 'email';
  
  useEffect(() => {
    if (user) {
        fetchStats();
        // Load AI Config
        const savedConfig = localStorage.getItem('weblens_ai_config');
        if (savedConfig) {
            setAiConfig(JSON.parse(savedConfig));
        }
    }
  }, [user]);

  const fetchStats = async () => {
    try {
        const res: any = await api.get(API_ENDPOINTS.USER_STATS);
        setStats(res);
    } catch (e) {
        console.error('Failed to fetch stats:', e);
    } finally {
        setLoading(false);
    }
  };

  const handleSaveAiConfig = () => {
      localStorage.setItem('weblens_ai_config', JSON.stringify(aiConfig));
      // Optional: Add visual feedback
      alert('AI Configuration Saved locally!');
  };
  
  if (!user) return null;

  return (
    <div className="min-h-screen bg-black text-gray-200 p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-2">Account Settings</h1>
            <p className="text-zinc-500 text-sm">Manage your profile and preferences.</p>
          </div>
          <button 
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-6">
           <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                  <div className="relative group">
                      <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20" />
                      {avatarUrl ? (
                          <img 
                            src={avatarUrl} 
                            alt="Profile" 
                            className="w-20 h-20 rounded-full border-2 border-indigo-500/50 object-cover relative z-10"
                          />
                      ) : (
                          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-xl relative z-10 border-2 border-white/10">
                              {user.email?.charAt(0).toUpperCase()}
                          </div>
                      )}
                  </div>
                  <div className="space-y-1">
                      <div className="flex items-center gap-3">
                          <h2 className="text-xl font-black text-white tracking-tight">
                              {fullName || (user.email?.split('@')[0])}
                          </h2>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[8px] font-black uppercase tracking-widest border border-indigo-500/20">
                             {provider}
                          </span>
                      </div>
                      <p className="text-zinc-400 text-sm font-medium">{user.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[9px] font-bold uppercase border border-emerald-500/20">
                             <Shield className="w-2.5 h-2.5" /> Verified
                          </span>
                      </div>
                  </div>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
              <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-1">
                 <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                    <User className="w-3.5 h-3.5" />
                    Internal User ID
                 </div>
                 <p className="font-mono text-zinc-300 text-[11px] truncate select-all">{user.id}</p>
              </div>
              
              <div className="p-4 bg-black/40 rounded-xl border border-white/5 space-y-1">
                 <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                    <Clock className="w-3.5 h-3.5" />
                    Creation Timestamp
                 </div>
                 <p className="font-mono text-zinc-300 text-[11px]">
                    {new Date(user.created_at).toLocaleString()}
                 </p>
              </div>
           </div>
        </div>

        {/* Usage / Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard label="Flows Created" value={stats.flows.toString()} loading={loading} />
            <StatsCard label="Executions Run" value={stats.executions.toString()} loading={loading} />
            <StatsCard label="Screenshots" value={stats.screenshots.toString()} loading={loading} />
        </div>


        {/* AI Configuration Card (BYOK) */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
            </div>
            
            <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <Cpu className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg font-black text-white">AI Model Configuration</h2>
                    <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Bring Your Own Key (Free Forever)</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                <div className="space-y-1 z-20">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Provider</label>
                    <CustomSelect 
                        value={aiConfig.provider} 
                        onChange={(val) => setAiConfig({...aiConfig, provider: val})} 
                        options={[
                            { value: 'gemini', label: 'Google Gemini' },
                            { value: 'openai', label: 'OpenAI (GPT-4)' },
                            { value: 'anthropic', label: 'Anthropic (Claude)' },
                            { value: 'custom', label: 'Custom (Ollama)' }
                        ]}
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Model Name (Optional)</label>
                    <input 
                        type="text" 
                        value={aiConfig.model}
                        onChange={(e) => setAiConfig({...aiConfig, model: e.target.value})}
                        placeholder={
                            aiConfig.provider === 'gemini' ? 'gemini-2.5-flash' :
                            aiConfig.provider === 'openai' ? 'gpt-4o' :
                            aiConfig.provider === 'anthropic' ? 'claude-3-5-sonnet-20240620' : 'llama3'
                        }
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 placeholder-zinc-700 h-[38px]" 
                    />
                </div>

                <div className="col-span-1 md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">API Key</label>
                    <div className="relative">
                        <Key className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600" />
                        <input 
                            type="password" 
                            value={aiConfig.apiKey}
                            onChange={(e) => setAiConfig({...aiConfig, apiKey: e.target.value})}
                            placeholder="sk-..."
                            className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 placeholder-zinc-700 font-mono"
                        />
                    </div>
                    <p className="text-[10px] text-zinc-600">
                        Top Secret. Stored locally in your browser. Never saved to our servers.
                    </p>
                </div>

                {aiConfig.provider === 'custom' && (
                    <div className="col-span-1 md:col-span-2 space-y-1 animate-in slide-in-from-top-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Base URL</label>
                        <div className="relative">
                            <Server className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600" />
                            <input 
                                type="text" 
                                value={aiConfig.baseUrl}
                                onChange={(e) => setAiConfig({...aiConfig, baseUrl: e.target.value})}
                                placeholder="http://localhost:11434/v1"
                                className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 placeholder-zinc-700 font-mono"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end pt-2">
                <button 
                    onClick={handleSaveAiConfig}
                    className="flex items-center gap-2 px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
                >
                    <Save className="w-4 h-4" />
                    Save Configuration
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ label, value, loading }: { label: string, value: string, loading?: boolean }) {
    return (
        <div className="p-5 bg-zinc-900/30 border border-white/5 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-zinc-900/50 transition-colors h-28">
            {loading ? (
                <Skeleton className="h-8 w-12 rounded-lg" />
            ) : (
                <span className="text-3xl font-black text-white">{value}</span>
            )}
            <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{label}</span>
        </div>
    )
}

function CustomSelect({ value, onChange, options }: { value: string, onChange: (val: string) => void, options: { value: string, label: string }[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedLabel = options.find(o => o.value === value)?.label || value;

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white flex items-center justify-between hover:bg-black/60 transition-colors h-[38px] focus:outline-none focus:border-indigo-500/50"
            >
                <span>{selectedLabel}</span>
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-white/10 rounded-lg shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:text-white hover:bg-white/5 flex items-center justify-between transition-colors"
                            >
                                {opt.label}
                                {value === opt.value && <Check className="w-3.5 h-3.5 text-indigo-500" />}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
