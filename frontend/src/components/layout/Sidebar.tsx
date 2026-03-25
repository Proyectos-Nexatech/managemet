import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShieldCheck, 
  FileText, 
  Activity, 
  Settings,
  HelpCircle,
  MessageSquare,
  CreditCard,
  Layers,
  Users,
  ChevronRight,
  LogOut,
  AlertTriangle,
  ClipboardCheck,
  Calendar as CalendarIcon,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';

const menuGroups = [
  {
    title: 'MENU',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard, module: 'dashboard' },
      { name: 'Magnitudes', href: '/magnitudes', icon: Layers, module: 'magnitudes' },
      { name: 'Equipos', href: '/equipos', icon: Activity, module: 'equipos' },
      { name: 'Competencias', href: '/competencias', icon: ShieldCheck, module: 'competencias' },
      { name: 'Programa', href: '/programa', icon: CalendarIcon, module: 'programa' },
    ],
  },
  {
    title: 'TECHNICAL',
    items: [
      { name: 'Calibraciones', href: '/calibraciones', icon: CreditCard, module: 'calibraciones' },
      { name: 'No Conformidades', href: '/no-conformidades', icon: AlertTriangle, module: 'no_conformidades' },
      { name: 'Auditorías', href: '/auditorias', icon: ClipboardCheck, module: 'auditorias' },
      { name: 'Documentos', href: '/documentos', icon: FileText, module: 'documentos' },
      { name: 'Usuarios', href: '/usuarios', icon: Users, module: 'usuarios' },
      { name: 'Cargos y Perfiles', href: '/config-cargos', icon: Briefcase, module: 'config_cargos' },
    ],
  },
  {
    title: 'SUPPORT',
    items: [
      { name: 'Settings', href: '/settings', icon: Settings, module: 'settings' },
      { name: 'Feedback', href: '/feedback', icon: MessageSquare, module: 'feedback' },
      { name: 'Help', href: '/help', icon: HelpCircle, module: 'help' },
    ],
  },
];

export function Sidebar() {
  const location = useLocation();
  const { signOut, can, profile } = useAuth();

  return (
    <div className="flex h-full w-[280px] flex-col bg-white border-r border-slate-200/60 p-6">
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center overflow-hidden border border-slate-100 shadow-sm">
          <img src="/logo.png" alt="ManageMet Logo" className="w-full h-full object-contain p-1.5" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-xl font-black tracking-tight text-slate-800 leading-none">ManageMet</h1>
          {profile && <span className="text-[9px] font-black text-primary uppercase tracking-widest mt-1 opacity-60">{profile.role?.name.replace('_', ' ')}</span>}
        </div>
      </div>

      <nav className="flex-1 space-y-8 overflow-y-auto custom-scrollbar pr-2">
        {menuGroups.map((group) => {
          const visibleItems = group.items.filter(item => can(item.module, 'read'));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title} className="space-y-2">
              <h3 className="px-4 text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                {group.title}
              </h3>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={clsx(
                        "group flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200",
                        isActive 
                          ? "bg-primary text-white shadow-lg shadow-primary/25" 
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={clsx("w-5 h-5", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-900")} />
                        {item.name}
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-4">
        {profile && (
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400 uppercase">
              {profile.full_name[0]}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-black text-slate-800 truncate leading-none mb-1">{profile.full_name}</span>
              <span className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-tight">{profile.email}</span>
            </div>
          </div>
        )}
        <button 
          onClick={() => signOut()}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 text-sm font-black hover:bg-red-50 hover:text-red-500 transition-all w-full group"
        >
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

