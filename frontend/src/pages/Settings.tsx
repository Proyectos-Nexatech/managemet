import { Construction, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Settings() {
  return (
    <div className="h-full w-full bg-white rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-center p-10 select-none animate-in fade-in zoom-in duration-500">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="relative inline-block group">
          <div className="absolute -inset-4 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-500" />
          <div className="relative w-24 h-24 bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 flex items-center justify-center mx-auto border border-slate-50 overflow-hidden transform group-hover:rotate-6 group-hover:scale-110 transition-all duration-500">
            <Construction className="w-12 h-12 text-primary animate-bounce mt-1" />
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100/50">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Sección en Desarrollo
          </div>
          
          <h2 className="text-4xl font-black tracking-tighter text-slate-800 leading-tight">
            Configuración en <span className="text-primary italic">progreso</span>
          </h2>
          
          <p className="text-sm font-bold text-slate-400 leading-relaxed max-w-[300px] mx-auto">
            Estamos trabajando para brindarte el control total del laboratorio. Muy pronto podrás gestionar aquí tus preferencias.
          </p>
        </div>

        <div className="pt-6">
          <Link 
            to="/" 
            className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-white text-sm font-black rounded-2xl shadow-lg shadow-primary/25 hover:bg-slate-900 transition-all hover:scale-105 active:scale-95 group"
          >
            <Home className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            Volver al Dashboard
          </Link>
        </div>
        
        {/* Progress bar mockup */}
        <div className="w-full max-w-[200px] mx-auto pt-8">
          <div className="flex justify-between text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2">
             <span>Progreso</span>
             <span>65%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
            <div className="h-full w-[65%] bg-primary rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)] animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
