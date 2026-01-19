import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, AlertCircle, Github } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const res = await fetch('http://localhost:8000/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Signup failed');
        }
        setMessage('Check your email for the confirmation link!');
      } else {
        const res = await fetch('http://localhost:8000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Login failed');
        }
        
        const data = await res.json();
        
        // Hydrate Supabase Client Session
        const { error } = await supabase.auth.setSession(data.session);
        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'github' | 'google') => {
    setSocialLoading(provider);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Social auth failed');
      setSocialLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans selection:bg-indigo-500 selection:text-white overflow-hidden relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px]" />
        
        {/* Faint static grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ 
          backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative w-full max-w-[400px] z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Sleek Professional Card */}
        <div className="bg-zinc-950 border border-white/10 rounded-2xl shadow-[0_20px_100px_rgba(0,0,0,0.8)] overflow-hidden relative group">
          {/* Top Accent Line (Library Modal Colors) */}
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          <div className="p-8 pb-10">
            <div className="flex flex-col items-center mb-10 mt-2">
              <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center mb-4 shadow-inner group-hover:border-indigo-500/30 transition-colors duration-500 overflow-hidden">
                <img src="/logo-no-bg.png" alt="WebLens" className="w-10 h-10 object-contain" />
              </div>
              <h1 className="text-xl font-black text-white tracking-widest uppercase mb-1">WebLens</h1>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Autonomous Visual Testing</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-1.5 group/input">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-focus-within/input:text-indigo-400 transition-colors">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-indigo-500/40 focus:bg-zinc-900/40 transition-all placeholder:text-zinc-800 font-medium"
                  placeholder="name@nexus.com"
                />
              </div>
              
              <div className="space-y-1.5 group/input">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-focus-within/input:text-purple-400 transition-colors">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-purple-500/40 focus:bg-zinc-900/40 transition-all placeholder:text-zinc-800 font-medium"
                  placeholder="••••••••••••"
                />
              </div>

              {error && (
                <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-none" />
                  <p className="text-[11px] text-rose-400/80 font-medium leading-relaxed">{error}</p>
                </div>
              )}

              {message && (
                <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-lg animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400">System Message</p>
                  </div>
                  <p className="text-[11px] text-indigo-300/70 font-medium ml-3.5">{message}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !!socialLoading}
                className="w-full h-12 bg-white text-black font-black text-[11px] uppercase tracking-[0.2em] rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-zinc-200 shadow-xl shadow-white/5 border border-white group/btn"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                )}
              </button>
            </form>

            {/* Social Auth Section */}
            {!isSignUp && (
              <div className="mt-8 space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/5"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black">
                    <span className="px-4 bg-zinc-950 text-zinc-600">Secure Social Link</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleSocialAuth('google')}
                    disabled={loading || !!socialLoading}
                    className="flex items-center justify-center gap-2 h-11 bg-black/40 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-50"
                  >
                    {socialLoading === 'google' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Google
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleSocialAuth('github')}
                    disabled={loading || !!socialLoading}
                    className="flex items-center justify-center gap-2 h-11 bg-black/40 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-50"
                  >
                    {socialLoading === 'github' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Github className="w-4 h-4" />
                        GitHub
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-8 pt-8 border-t border-white/5 text-center">
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-zinc-500 hover:text-white transition-all text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 mx-auto group/toggle"
              >
                <span>{isSignUp ? 'Already have an account?' : "Don't have an account?"}</span>
                <span className="text-white border-b border-indigo-500/40 group-hover/toggle:border-indigo-500 transition-colors">
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
