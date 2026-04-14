import { 
  Activity, 
  TrendingUp,
  ChevronDown,
  ShieldAlert,
  Thermometer,
  FileCheck,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { correctiveActionService } from '../services/correctiveActions';
import { environmentalService } from '../services/environmentalRecords';
import { resultReportService } from '../services/resultReports';
import clsx from 'clsx';

export function Dashboard() {
  const [isoStats, setIsoStats] = useState({
    corrective: 0,
    outOfLimits: 0,
    pendingReports: 0,
    totalEquip: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [ca, er, rr] = await Promise.all([
          correctiveActionService.getAll(),
          environmentalService.getRecords(50),
          resultReportService.getAll()
        ]);

        setIsoStats({
          corrective: ca.filter((a: any) => a.status === 'open' || a.status === 'in_progress').length,
          outOfLimits: er.filter((r: any) => !r.within_limits).length,
          pendingReports: rr.filter((r: any) => r.status === 'draft' || r.status === 'review').length,
          totalEquip: 34760
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchDashboardData();
  }, []);

  const stats = [
    { title: 'Informes Pendientes', value: isoStats.pendingReports, trend: '+2', trendType: 'up', icon: FileCheck, color: 'bg-primary' },
    { title: 'Equipos Activos', value: '34,760', trend: '+12.4%', trendType: 'up', icon: Activity, color: 'bg-slate-100' },
    { title: 'Acciones Correctivas', value: isoStats.corrective, trend: 'Pendientes', trendType: isoStats.corrective > 0 ? 'down' : 'up', icon: ShieldAlert, color: 'bg-slate-100' },
    { title: 'Alertas Ambientales', value: isoStats.outOfLimits, trend: 'Críticos', trendType: isoStats.outOfLimits > 0 ? 'down' : 'up', icon: Thermometer, color: 'bg-slate-100' },
  ];

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
        {stats.map((stat, i) => (
          <Card key={i} className={clsx(
            "border-none shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2.5rem] overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_20px_60px_rgb(0,0,0,0.05)]",
            stat.color === 'bg-primary' ? 'bg-primary text-white' : 'bg-white text-slate-800'
          )}>
            <CardContent className="p-4 lg:p-6 flex flex-col gap-4 relative overflow-hidden group">
              <div className="flex justify-between items-start">
                 <div className={clsx(
                   "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-500 group-hover:rotate-6 group-hover:scale-110",
                   stat.color === 'bg-primary' ? 'bg-white text-primary border-white/20' : 'bg-slate-50 text-slate-800 border-slate-100'
                 )}>
                   <stat.icon className="w-6 h-6" />
                 </div>
                 <div className={clsx(
                   "flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black tracking-tight",
                   stat.trendType === 'up' 
                     ? (stat.color === 'bg-primary' ? 'bg-green-400 text-white' : 'bg-green-100 text-green-600') 
                     : (stat.color === 'bg-primary' ? 'bg-red-400 text-white' : 'bg-red-100 text-red-600')
                 )}>
                    {stat.trendType === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                    {stat.trend}
                 </div>
              </div>
              
              <div>
                <p className={clsx("text-xs font-bold mb-2 uppercase tracking-widest", stat.color === 'bg-primary' ? 'text-white/60' : 'text-slate-400')}>
                  {stat.title}
                </p>
                <p className="text-3xl font-black tracking-tighter transition-transform group-hover:translate-x-1 duration-300">
                  {stat.value}
                </p>
                {stat.color === 'bg-primary' && (
                  <p className="text-[10px] font-bold text-white/50 mt-2">vs el mes pasado</p>
                )}
                {stat.color !== 'bg-primary' && (
                   <p className="text-[10px] font-bold text-slate-300 mt-2">vs el mes pasado</p>
                )}
              </div>
              
              {/* Decorative circle on primary card */}
              {stat.color === 'bg-primary' && (
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Area Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0 pb-4">
        {/* Left: Huge Chart Card */}
        <Card className="lg:col-span-2 border-none shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2rem] bg-white p-6 lg:p-8 group overflow-hidden relative flex flex-col">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
             <div className="space-y-1">
               <h3 className="text-xl font-black tracking-tight text-slate-800">Tendencia de Calibración</h3>
               <p className="text-xs font-bold text-slate-400">Track your laboratory efficiency</p>
             </div>
             
             <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 group/legend cursor-pointer">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200 group-hover:scale-125 transition-transform" />
                    <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-800 transition-colors">Vencidas</span>
                  </div>
                  <div className="flex items-center gap-2 group/legend cursor-pointer">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary group-hover:scale-125 transition-transform shadow-lg shadow-primary/20" />
                    <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-800 transition-colors">Completadas</span>
                  </div>
                </div>
                
                <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black text-slate-700 hover:bg-slate-100 transition-colors">
                  This year <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
             </div>
          </div>

          <div className="flex-1 w-full flex items-end justify-between px-2 pb-6 relative min-h-0">
             {/* Mocking bar chart as seen in image */}
             {[45, 78, 56, 92, 45, 68, 88, 55, 60, 42, 75, 50].map((h, i) => (
                <div key={i} className="flex flex-col items-center gap-2 group/bar w-full max-w-[24px]">
                   <div className="w-full flex flex-col justify-end h-full gap-1 rounded-full bg-transparent overflow-hidden">
                      <div 
                        className="w-full bg-slate-100 rounded-full transition-all duration-1000 group-hover/bar:bg-slate-200" 
                        style={{ height: `${h * 0.8}%` }} 
                      />
                      <div 
                        className="w-full bg-primary rounded-full transition-all duration-1000 group-hover/bar:scale-x-110 shadow-lg shadow-primary/10" 
                        style={{ height: `${h}%` }} 
                      />
                   </div>
                   <span className="text-[10px] font-black text-slate-300 group-hover/bar:text-slate-800 transition-colors">
                     {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}
                   </span>
                </div>
             ))}
             
             {/* Tooltip mockup */}
             <div className="absolute left-[33%] top-0 group-hover:scale-110 transition-transform duration-500">
                <div className="bg-slate-900 shadow-2xl rounded-3xl p-5 relative after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-transparent after:border-t-slate-900 border border-white/5 pointer-events-none">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                       <div className="w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-primary/20 animate-pulse" />
                       <span className="text-white text-xs font-black tracking-tight">43.787 Calib.</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="w-2.5 h-2.5 rounded-full bg-slate-600 ring-4 ring-slate-600/20" />
                       <span className="text-white text-xs font-black tracking-tight">39.784 Equip.</span>
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </Card>

        {/* Right Area: Stats stack */}
        <div className="space-y-4 flex flex-col h-full">
           {/* Half Donut Card */}
           <Card className="flex-1 border-none shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2rem] bg-white p-6 lg:p-8 group overflow-hidden relative flex flex-col">
              <div className="flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black tracking-tight text-slate-800">Estadísticas por Magnitud</h3>
                    <p className="text-xs font-bold text-slate-400">Distribución de activos por tipo</p>
                  </div>
                  <button className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 hover:text-primary hover:bg-white transition-all">
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>

                <div className="relative flex-1 w-full mb-6 flex items-center justify-center min-h-[220px]">
                   {/* Background rings for better depth */}
                   <div className="absolute w-52 h-52 rounded-full border-[10px] border-slate-50" />
                   <div className="absolute w-52 h-52 rounded-full border-[10px] border-primary border-t-transparent border-r-transparent group-hover:rotate-[30deg] transition-transform duration-1000 shadow-lg shadow-primary/5" />
                   
                   <div className="absolute w-40 h-40 rounded-full border-[10px] border-slate-50" />
                   <div className="absolute w-40 h-40 rounded-full border-[10px] border-emerald-400 border-l-transparent border-t-transparent group-hover:-rotate-[45deg] transition-transform duration-1000 shadow-lg shadow-emerald-400/5" />

                   <div className="absolute w-28 h-28 rounded-full border-[10px] border-slate-50" />
                   <div className="absolute w-28 h-28 rounded-full border-[10px] border-red-400 border-b-transparent border-l-transparent group-hover:rotate-[60deg] transition-transform duration-1000 shadow-lg shadow-red-400/5" />
                   
                   <div className="text-center z-10 bg-white/80 backdrop-blur-sm rounded-full p-4">
                     <p className="text-3xl font-black tracking-tighter text-slate-800 leading-none">9.829</p>
                     <p className="text-[10px] font-black tracking-[0.15em] text-slate-400 uppercase mt-1">Total Equipos</p>
                     <div className="inline-flex items-center gap-1 bg-green-50 text-green-500 text-[9px] font-black px-2 py-0.5 rounded-full mt-2">
                       +5.34%
                     </div>
                   </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-50 flex-shrink-0">
                   {[
                     { name: 'Temperatura', count: '2.487', trend: '+1.8%', type: 'up' },
                     { name: 'Presión', count: '1.828', trend: '+2.3%', type: 'up' },
                     { name: 'Masa', count: '1.463', trend: '-1.04%', type: 'down' },
                   ].map((item, i) => (
                     <div key={i} className="flex items-center justify-between group/list cursor-pointer py-1">
                        <div className="flex items-center gap-3">
                           <div className={clsx("w-2 h-2 rounded-full", i === 0 ? "bg-primary" : i === 1 ? "bg-emerald-400" : "bg-red-400")} />
                           <span className="text-xs font-bold text-slate-600 group-hover/list:text-slate-900 transition-colors uppercase tracking-tight">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-slate-800">{item.count}</span>
                          <span className={clsx("text-[9px] font-black px-2 py-0.5 rounded-full", item.type === 'up' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500')}>
                            {item.trend}
                          </span>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
