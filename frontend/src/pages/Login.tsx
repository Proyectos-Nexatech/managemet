import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogIn, Mail, Lock, Loader2 } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 animate-in fade-in duration-1000">
      <Card className="w-full max-w-md rounded-[3rem] border-none shadow-2xl shadow-slate-200 overflow-hidden bg-white">
        <div className="p-12 space-y-8">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <LogIn className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-800 uppercase">ManageMet</h1>
            <p className="text-xs font-bold text-slate-400">Panel de Control Metrológico</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                <input 
                  type="email" 
                  placeholder="Email corporativo" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                />
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                <input 
                  type="password" 
                  placeholder="Contraseña" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                <p className="text-[11px] font-bold text-red-500 text-center uppercase tracking-wide">{error}</p>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-14 rounded-2xl bg-primary text-white font-black text-sm shadow-xl shadow-primary/25 hover:scale-[1.03] active:scale-95 transition-all"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'ENTRAR AL SISTEMA'}
            </Button>
          </form>

          <div className="text-center">
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">© 2026 Bustillo Ingeniería</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
