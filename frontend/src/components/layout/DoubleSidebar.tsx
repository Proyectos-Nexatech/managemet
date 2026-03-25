import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShieldCheck, 
  Settings,
  Plus,
  ArrowUpCircle,
  Cloud,
  ChevronRight,
  HardDrive,
  Grid,
  MessageSquare,
  Archive,
  Activity,
  FileText
} from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/components/ui/button';

const mainNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Magnitudes', href: '/magnitudes', icon: Grid },
  { name: 'Competencias', href: '/competencias', icon: ShieldCheck },
  { name: 'Chat', href: '/chat', icon: MessageSquare },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const secondaryNavigation = [
  { name: 'General', href: '/', icon: Archive, size: '67 Gb / 128 Gb', color: 'text-blue-500' },
  { name: 'Laboratorio', href: '/lab', icon: Cloud, size: '83 Gb / 512 Gb', color: 'text-orange-500' },
  { name: 'Certificados', href: '/docs', icon: Cloud, size: '124 Gb / 256 Gb', color: 'text-blue-600' },
];

export function DoubleSidebar() {
  const location = useLocation();

  return (
    <div className="flex h-full">
      {/* Slim Blue Sidebar */}
      <div className="w-[80px] bg-primary flex flex-col items-center py-6 gap-8">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-lg mb-4">
          <HardDrive className="w-7 h-7" />
        </div>
        
        <nav className="flex flex-col gap-6">
          {mainNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={clsx(
                  "p-3 rounded-2xl transition-all duration-200 group relative",
                  isActive ? "bg-white/20 text-white" : "text-white/60 hover:text-white hover:bg-white/10"
                )}
              >
                <item.icon className="w-6 h-6" />
                {!isActive && (
                  <span className="absolute left-full ml-4 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <button className="p-3 text-white/60 hover:text-white transition-colors">
            <ArrowUpCircle className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Wider White Sidebar */}
      <div className="w-[280px] bg-white flex flex-col border-r border-border/50">
        <div className="p-8 pb-4">
          <h2 className="text-2xl font-bold text-slate-800">Storage</h2>
        </div>

        <div className="px-4 py-4 space-y-4">
          {secondaryNavigation.map((item) => (
            <div 
              key={item.name}
              className="flex items-center gap-4 p-4 rounded-3xl hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <div className={clsx("p-3 rounded-2xl bg-slate-100", item.color)}>
                <item.icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-700">{item.name}</p>
                <p className="text-xs text-slate-400">{item.size}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-8 mt-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Shared with me</p>
          <div className="space-y-4 text-sm font-bold text-slate-600">
            <div className="flex items-center gap-3 cursor-pointer hover:text-primary transition-colors">
              <Activity className="w-4 hide-4" /> Recent
            </div>
            <div className="flex items-center gap-3 cursor-pointer hover:text-primary transition-colors">
               <ShieldCheck className="w-4 h-4" /> Starred
            </div>
            <div className="flex items-center gap-3 cursor-pointer hover:text-primary transition-colors">
               <FileText className="w-4 h-4" /> Trash
            </div>
          </div>
        </div>

        <div className="mt-auto p-6">
          <div className="bg-blue-50/50 rounded-3xl p-6 border border-blue-100 relative overflow-hidden group mb-6">
            <div className="relative z-10">
              <p className="text-sm font-bold text-slate-800 mb-1">Upgrade to PRO</p>
              <p className="text-xs text-slate-500 mb-4">for get all features</p>
              <Button variant="link" className="p-0 h-auto text-primary font-bold flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                Upgrade Now <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <HardDrive className="absolute -right-4 -bottom-4 w-20 h-20 text-blue-100/50 -rotate-12" />
          </div>

          <Button className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> Create New
          </Button>
        </div>
      </div>
    </div>
  );
}
