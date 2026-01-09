import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Shield, Clock, LogOut } from 'lucide-react';
import { Skeleton } from '../components/Skeleton';

export default function Settings() {
  const { user, signOut, session } = useAuth();
  const [stats, setStats] = useState({ flows: 0, executions: 0, screenshots: 0 });
  const [loading, setLoading] = useState(true);

  // Extract metadata safely
  const metadata = user?.user_metadata || {};
  const avatarUrl = metadata.avatar_url || metadata.picture;
  const fullName = metadata.full_name || metadata.name;
  const provider = user?.app_metadata?.provider || 'email';
  
  // ... (useEffects and fetchStats)
  useEffect(() => {
    if (user) {
        fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
        const token = session?.access_token;
        const res = await fetch('http://localhost:8000/api/user/stats', {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (res.ok) {
            const data = await res.json();
            setStats(data);
        }
    } catch (e) {
        console.error('Failed to fetch stats:', e);
    } finally {
        setLoading(false);
    }
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
