import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Search, Bell, ChevronDown } from 'lucide-react';

export function DashboardLayout() {
  return (
    <div className="flex h-screen bg-[#F7F8FC] text-slate-800 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[72px] flex items-center justify-between px-10 bg-transparent z-30">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black tracking-tight text-slate-800">Dashboard Metrológico</h2>
            <p className="text-xs font-bold text-slate-400 capitalize">Friday, December 15th 2023</p>
          </div>
          
          <div className="flex items-center gap-6 bg-white/50 backdrop-blur-sm p-3 rounded-[2rem] border border-slate-100/50 shadow-sm shadow-slate-200/20">
             <div className="flex items-center gap-1">
               <button className="flex items-center justify-center p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-900 rounded-full transition-all duration-200 hover:scale-105">
                 <Search className="w-5 h-5 stroke-[2.5]" />
               </button>
               <button className="relative flex items-center justify-center p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-900 rounded-full transition-all duration-200 hover:scale-105">
                 <Bell className="w-5 h-5 stroke-[2.5]" />
                 <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
               </button>
             </div>
             
             <div className="flex items-center gap-3 pl-4 border-l border-slate-100 group cursor-pointer">
                <div className="w-9 h-9 rounded-xl bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                   <img src="https://ui-avatars.com/api/?name=Ferra+Alexandra&background=random" alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-[13px] font-black text-slate-800 group-hover:text-primary transition-colors">Ferra Alexandra</p>
                  <p className="text-[10px] font-bold text-slate-400 mb-[1px]">admin@managemet.com</p>
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
