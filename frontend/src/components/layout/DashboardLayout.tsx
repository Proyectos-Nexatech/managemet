import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function DashboardLayout() {
  const { profile } = useAuth();
  
  const userName = profile?.full_name || 'Usuario';
  const userEmail = profile?.email || '';
  const avatarUrl = profile?.full_name 
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&background=random`
    : `https://ui-avatars.com/api/?name=U&background=random`;

  return (
    <div className="flex h-screen bg-[#F7F8FC] text-slate-800 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[72px] flex items-center justify-between px-10 bg-transparent z-30">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black tracking-tight text-slate-800">Dashboard Metrológico</h2>
            <p className="text-xs font-bold text-slate-400 capitalize">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          
          <div className="flex items-center gap-6 bg-white/50 backdrop-blur-sm p-3 rounded-[2rem] border border-slate-100/50 shadow-sm shadow-slate-200/20">
             <div className="flex items-center gap-3 px-2 group cursor-pointer">
                <div className="w-9 h-9 rounded-xl bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                   <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-[13px] font-black text-slate-800 group-hover:text-primary transition-colors">{userName}</p>
                  <p className="text-[10px] font-bold text-slate-400 mb-[1px]">{userEmail}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors duration-300" />
             </div>
          </div>
        </header>

        <main className="flex-1 w-full overflow-y-auto px-10 py-2 relative custom-scrollbar">
          <div className="max-w-[1400px] mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
