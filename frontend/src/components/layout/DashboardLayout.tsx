import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ChevronDown, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function DashboardLayout() {
  const { profile } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const userName = profile?.full_name || 'Usuario';
  const userEmail = profile?.email || '';
  const avatarUrl = profile?.full_name 
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&background=random`
    : `https://ui-avatars.com/api/?name=U&background=random`;

  return (
    <div className="flex h-screen bg-[#F7F8FC] text-slate-800 overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-50 lg:relative lg:z-0 transform transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Responsive Header */}
        <header className="h-[72px] flex items-center justify-between px-4 lg:px-10 bg-transparent z-30 flex-shrink-0">
          <div className="flex items-center gap-4">
            {/* Hamburger Button */}
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:bg-white rounded-xl shadow-sm transition-colors border border-slate-100"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex flex-col">
              <h2 className="text-lg lg:text-2xl font-black tracking-tight text-slate-800 line-clamp-1">Dashboard Metrológico</h2>
              <p className="text-[10px] lg:text-xs font-bold text-slate-400 capitalize hidden sm:block">
                {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 lg:gap-6 bg-white/50 backdrop-blur-sm p-2 lg:p-3 rounded-2xl lg:rounded-[2rem] border border-slate-100/50 shadow-sm shadow-slate-200/20">
             <div className="flex items-center gap-2 lg:gap-3 px-1 lg:px-2 group cursor-pointer">
                <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                   <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-[12px] lg:text-[13px] font-black text-slate-800 group-hover:text-primary transition-colors line-clamp-1">{userName}</p>
                  <p className="text-[9px] lg:text-[10px] font-bold text-slate-400 mb-[1px] hidden md:block">{userEmail}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors duration-300" />
             </div>
          </div>
        </header>

        <main className="flex-1 w-full overflow-y-auto px-4 lg:px-10 py-2 relative custom-scrollbar">
          <div className="max-w-[1400px] mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
