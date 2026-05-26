import { 
  TrendingUp,
  TrendingDown,
  Thermometer,
  FileCheck,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  FileX,
  UserX,
  ClipboardList,
  ShieldCheck,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Gauge as GaugeIcon
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { correctiveActionService } from '../services/correctiveActions';
import { environmentalService } from '../services/environmentalRecords';
import { resultReportService } from '../services/resultReports';
import { equipmentService } from '../services/equipment';
import { documentService } from '../services/documents';
import { ncService } from '../services/nonConformities';
import { scheduleService } from '../services/schedule';
import { addDays, differenceInDays, format, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import clsx from 'clsx';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
interface KPI {
  title: string;
  value: string | number;
  subtitle: string;
  trend: 'up' | 'down' | 'neutral';
  trendLabel: string;
  icon: React.ElementType;
  color: 'primary' | 'green' | 'red' | 'orange' | 'blue' | 'slate';
}

const colorMap = {
  primary: { card: 'bg-primary', icon: 'bg-white/15 text-white', text: 'text-white/70', value: 'text-white', badge_up: 'bg-green-400/20 text-green-100', badge_down: 'bg-red-400/20 text-red-100', badge_neutral: 'bg-white/10 text-white/60' },
  green:   { card: 'bg-white', icon: 'bg-green-50 text-green-600', text: 'text-slate-400', value: 'text-green-600', badge_up: 'bg-green-100 text-green-600', badge_down: 'bg-red-100 text-red-600', badge_neutral: 'bg-slate-100 text-slate-500' },
  red:     { card: 'bg-white', icon: 'bg-red-50 text-red-500', text: 'text-slate-400', value: 'text-red-500', badge_up: 'bg-green-100 text-green-600', badge_down: 'bg-red-100 text-red-600', badge_neutral: 'bg-slate-100 text-slate-500' },
  orange:  { card: 'bg-white', icon: 'bg-orange-50 text-orange-500', text: 'text-slate-400', value: 'text-orange-500', badge_up: 'bg-green-100 text-green-600', badge_down: 'bg-orange-100 text-orange-600', badge_neutral: 'bg-slate-100 text-slate-500' },
  blue:    { card: 'bg-white', icon: 'bg-blue-50 text-blue-600', text: 'text-slate-400', value: 'text-blue-600', badge_up: 'bg-green-100 text-green-600', badge_down: 'bg-red-100 text-red-600', badge_neutral: 'bg-slate-100 text-slate-500' },
  slate:   { card: 'bg-white', icon: 'bg-slate-100 text-slate-600', text: 'text-slate-400', value: 'text-slate-800', badge_up: 'bg-green-100 text-green-600', badge_down: 'bg-red-100 text-red-600', badge_neutral: 'bg-slate-100 text-slate-500' },
};

function KPICard({ kpi }: { kpi: KPI }) {
  const c = colorMap[kpi.color];
  const badgeClass = kpi.trend === 'up' ? c.badge_up : kpi.trend === 'down' ? c.badge_down : c.badge_neutral;
  const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : CheckCircle2;
  
  return (
    <Card className={clsx(
      "border-none shadow-[0_8px_30px_rgb(0,0,0,0.03)] rounded-[2rem] overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group",
      c.card
    )}>
      <CardContent className="p-5 flex flex-col gap-4 relative overflow-hidden">
        <div className="flex justify-between items-start">
          <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:rotate-6 group-hover:scale-110", c.icon)}>
            <kpi.icon className="w-6 h-6" />
          </div>
          <div className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black tracking-tight", badgeClass)}>
            <TrendIcon className="w-3 h-3" />
            {kpi.trendLabel}
          </div>
        </div>
        <div>
          <p className={clsx("text-[10px] font-black mb-1 uppercase tracking-widest", c.text)}>{kpi.title}</p>
          <p className={clsx("text-3xl font-black tracking-tighter leading-none transition-transform group-hover:translate-x-1 duration-300", c.value)}>
            {kpi.value}
          </p>
          <p className={clsx("text-[10px] font-bold mt-2", c.text)}>{kpi.subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [equipmentStatusData, setEquipmentStatusData] = useState<any[]>([]);
  const [calibrationProjectionData, setCalibrationProjectionData] = useState<any[]>([]);
  const [gaugeData, setGaugeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);


        const [eq, docs, nc, _ca, er, rr, sched, allAuths] = await Promise.all([

          equipmentService.getAll(),
          documentService.getDocuments(),
          ncService.getAll(),
          correctiveActionService.getAll(),
          environmentalService.getRecords(50),
          resultReportService.getAll(),
          scheduleService.getSchedule(),
          supabase.from('personnel_authorizations').select('expiry_date, is_active').then(r => r.data || [])
        ]);

        // --- Equipment KPIs ---
        const activeEquip = eq.filter((e: any) => e.status !== 'out_of_service');
        const expiredCalib = activeEquip.filter((e: any) => {
          if (!e.last_calibration_date) return true;
          const next = addDays(new Date(e.last_calibration_date), e.calibration_period_days || 365);
          return differenceInDays(next, now) < 0;
        });
        const soonExpiring = activeEquip.filter((e: any) => {
          if (!e.last_calibration_date) return false;
          const next = addDays(new Date(e.last_calibration_date), e.calibration_period_days || 365);
          const d = differenceInDays(next, now);
          return d >= 0 && d <= 30;
        });
        const inMaintenance = eq.filter((e: any) => e.status === 'maintenance').length;
        const complianceRate = activeEquip.length > 0
          ? Math.round(((activeEquip.length - expiredCalib.length) / activeEquip.length) * 100)
          : 0;

        // --- Program Efficiency ---
        const scheduledThisMonth = sched.filter((s: any) => {
          const d = new Date(s.scheduled_date);
          return d >= monthStart && d <= monthEnd;
        });
        const completedThisMonth = scheduledThisMonth.filter((s: any) => s.status === 'completed').length;
        const efficiency = scheduledThisMonth.length > 0
          ? Math.round((completedThisMonth / scheduledThisMonth.length) * 100)
          : 0;

        // --- Documents ---
        const docsExpiring = docs.filter((d: any) => {
          if (!d.expiry_date) return false;
          const diff = differenceInDays(new Date(d.expiry_date), now);
          return diff >= 0 && diff <= 60;
        }).length;

        // --- Non-conformities ---
        const openNC = nc.filter((n: any) => n.status === 'open' || n.status === 'analysis' || n.status === 'in_progress').length;

        // --- Personnel ---
        const expiredAuths = (allAuths as any[]).filter((a: any) => {
          if (!a.is_active || !a.expiry_date) return false;
          return differenceInDays(new Date(a.expiry_date), now) < 0;
        }).length;

        // --- ISO compliance (audits) ---
        const pendingReports = rr.filter((r: any) => r.status === 'draft' || r.status === 'review').length;
        const envAlerts = er.filter((r: any) => !r.within_limits).length;

        // --- Equipment Status Data (Pie) ---
        setEquipmentStatusData([
          { name: 'Activos', value: activeEquip.length, color: '#3b82f6' },
          { name: 'Mantenimiento', value: inMaintenance, color: '#f97316' },
          { name: 'Fuera de Serv.', value: eq.filter((e: any) => e.status === 'out_of_service').length, color: '#ef4444' },
        ]);

        // --- Gauge Data (Radial Bar) ---
        setGaugeData([
          { name: 'Cumplimiento', value: complianceRate, fill: complianceRate >= 90 ? '#22c55e' : complianceRate >= 70 ? '#f59e0b' : '#ef4444' }
        ]);

        // --- Calibration Projection Data (Bar Chart) ---
        const projectionMonths: any[] = [];
        for (let i = 0; i < 6; i++) {
          const d = addMonths(now, i);
          projectionMonths.push({
            month: format(d, 'MMM', { locale: es }).toUpperCase(),
            year: d.getFullYear(),
            monthIndex: d.getMonth(),
            count: 0
          });
        }
        
        activeEquip.forEach((e: any) => {
           if (e.last_calibration_date && (e.calibration_period_days || 0) > 0) {
             const next = addDays(new Date(e.last_calibration_date), e.calibration_period_days);
             const d = differenceInDays(next, now);
             if (d >= 0 && d <= 180) {
               const mIdx = next.getMonth();
               const mYear = next.getFullYear();
               const slot = projectionMonths.find(m => m.monthIndex === mIdx && m.year === mYear);
               if (slot) {
                 slot.count += 1;
               }
             }
           }
        });
        setCalibrationProjectionData(projectionMonths);

        setKpis([
          {
            title: 'Calibraciones Pendientes',
            value: expiredCalib.length,
            subtitle: 'Vencidas o sin fecha registrada',
            trend: expiredCalib.length === 0 ? 'up' : 'down',
            trendLabel: expiredCalib.length === 0 ? 'Al día' : 'Requieren atención',
            icon: CalendarClock,
            color: expiredCalib.length === 0 ? 'green' : 'red',
          },
          {
            title: 'Próximos a Vencer',
            value: soonExpiring.length,
            subtitle: 'Equipos vencen en ≤30 días',
            trend: soonExpiring.length === 0 ? 'up' : soonExpiring.length <= 3 ? 'neutral' : 'down',
            trendLabel: soonExpiring.length === 0 ? 'Sin alertas' : 'Próxima atención',
            icon: AlertTriangle,
            color: soonExpiring.length === 0 ? 'slate' : 'orange',
          },
          {
            title: 'Eficiencia del Programa',
            value: `${efficiency}%`,
            subtitle: `${completedThisMonth}/${scheduledThisMonth.length} en el mes actual`,
            trend: efficiency >= 80 ? 'up' : efficiency >= 50 ? 'neutral' : 'down',
            trendLabel: efficiency >= 80 ? 'En objetivo' : 'Por mejorar',
            icon: ClipboardList,
            color: efficiency >= 80 ? 'green' : 'orange',
          },
          {
            title: 'No Conformidades Abiertas',
            value: openNC,
            subtitle: 'En análisis o en progreso',
            trend: openNC === 0 ? 'up' : openNC <= 3 ? 'neutral' : 'down',
            trendLabel: openNC === 0 ? 'Sin NC abiertas' : 'Requieren seguimiento',
            icon: FileX,
            color: openNC === 0 ? 'slate' : 'red',
          },
          {
            title: 'Docs. por Vencer',
            value: docsExpiring,
            subtitle: 'Documentos vencen en ≤60 días',
            trend: docsExpiring === 0 ? 'up' : 'down',
            trendLabel: docsExpiring === 0 ? 'Sin vencimientos' : 'Revisar urgente',
            icon: FileCheck,
            color: docsExpiring === 0 ? 'slate' : 'orange',
          },
          {
            title: 'Competencias Vencidas',
            value: expiredAuths,
            subtitle: 'Autorizaciones de personal expiradas',
            trend: expiredAuths === 0 ? 'up' : 'down',
            trendLabel: expiredAuths === 0 ? 'Personal al día' : 'Renovar autorización',
            icon: UserX,
            color: expiredAuths === 0 ? 'slate' : 'red',
          },
          {
            title: 'Alertas Ambientales',
            value: envAlerts,
            subtitle: 'Registros fuera de límites',
            trend: envAlerts === 0 ? 'up' : 'down',
            trendLabel: envAlerts === 0 ? 'Condiciones OK' : 'Fuera de rango',
            icon: Thermometer,
            color: envAlerts === 0 ? 'slate' : 'red',
          },
          {
            title: 'Informes Pendientes',
            value: pendingReports,
            subtitle: 'En borrador o revisión',
            trend: pendingReports === 0 ? 'up' : 'neutral',
            trendLabel: pendingReports === 0 ? 'Al día' : 'Pendientes de firma',
            icon: FileCheck,
            color: pendingReports === 0 ? 'slate' : 'blue',
          },
          {
            title: 'ISO Tasa Cumplimiento',
            value: `${Math.max(0, 100 - openNC * 5 - expiredAuths * 3)}%`,
            subtitle: 'Estimado basado en NC y personal',
            trend: openNC === 0 && expiredAuths === 0 ? 'up' : 'neutral',
            trendLabel: 'Cláusula 6.2 / 8.7',
            icon: ShieldCheck,
            color: openNC === 0 && expiredAuths === 0 ? 'green' : 'orange',
          },
        ]);
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cargando indicadores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-800">Dashboard Metrológico</h1>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>

      {/* KPI Grid (Non-redundant) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <KPICard key={i} kpi={kpi} />
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gauge Chart */}
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2rem] bg-white p-6 flex flex-col">
          <div className="mb-4 space-y-1">
            <h3 className="text-sm font-black tracking-tight text-slate-800 flex items-center gap-2">
               <GaugeIcon className="w-4 h-4 text-primary" /> Cumplimiento Metrológico
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado global del laboratorio</p>
          </div>
          <div className="flex-1 flex flex-col items-center justify-end relative pb-2 pt-4">
            <div className="w-full h-[120px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'fill', value: gaugeData[0]?.value || 0, fill: gaugeData[0]?.fill || '#3b82f6' },
                      { name: 'empty', value: Math.max(0, 100 - (gaugeData[0]?.value || 0)), fill: '#f1f5f9' }
                    ]}
                    cx="50%" cy="100%"
                    startAngle={180} endAngle={0}
                    innerRadius={70} outerRadius={110}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill={gaugeData[0]?.fill || '#3b82f6'} />
                    <Cell fill="#f1f5f9" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              
              {/* CSS Needle */}
              <div className="absolute bottom-0 left-1/2 w-0 h-0 z-10 flex justify-center">
                 {/* Rotating wrapper */}
                 <div 
                   className="absolute bottom-0 origin-bottom transition-transform duration-1000 ease-out flex justify-center"
                   style={{ transform: `rotate(${ -90 + ((gaugeData[0]?.value || 0) / 100) * 180 }deg)` }}
                 >
                   {/* Needle Body */}
                   <div className="w-1.5 h-[90px] bg-slate-800 rounded-t-full absolute bottom-0" />
                 </div>
                 {/* Center Dot */}
                 <div className="w-5 h-5 bg-slate-800 rounded-full border-4 border-white shadow-sm absolute bottom-[-10px]" />
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center text-center">
              <span className="text-4xl font-black text-slate-800 tracking-tighter leading-none">{gaugeData[0]?.value || 0}%</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Vigentes</span>
            </div>
          </div>
        </Card>

        {/* Pie Chart */}
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2rem] bg-white p-6 flex flex-col">
          <div className="mb-4 space-y-1">
            <h3 className="text-sm font-black tracking-tight text-slate-800 flex items-center gap-2">
               <PieChartIcon className="w-4 h-4 text-blue-500" /> Distribución de Equipos
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Por estado operativo</p>
          </div>
          <div className="flex-1 min-h-[180px] flex items-center justify-center -mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={equipmentStatusData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {equipmentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: any) => [`${value} equipos`, 'Cantidad']}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center flex-wrap gap-x-4 gap-y-2 mt-2">
             {equipmentStatusData.map((item, i) => (
               <div key={i} className="flex items-center gap-1.5">
                 <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.name} ({item.value})</span>
               </div>
             ))}
          </div>
        </Card>

        {/* Bar Chart */}
        <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2rem] bg-white p-6 flex flex-col">
          <div className="mb-4 space-y-1">
            <h3 className="text-sm font-black tracking-tight text-slate-800 flex items-center gap-2">
               <BarChartIcon className="w-4 h-4 text-orange-500" /> Proyección de Calibraciones
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Próximos 6 meses</p>
          </div>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={calibrationProjectionData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                <RechartsTooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Calibraciones" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
