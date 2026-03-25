import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Wand2, 
  Clock, 
  AlertCircle,
  FileText,
  Loader2,
  Monitor,
  Tag,
  Settings,
  Hash,
  CalendarDays
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '../components/ui/Modal';
import { scheduleService, type CalibrationScheduleItem } from '../services/schedule';
import { equipmentService, type Equipment } from '../services/equipment';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths,
  addDays,
  differenceInDays 
} from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';

const getMetrologicalStatus = (e: Equipment) => {
  if (!e.last_calibration_date) return { label: 'Pendiente', color: 'bg-slate-400', text: 'text-white shadow-slate-100' };
  const next = addDays(new Date(e.last_calibration_date), e.calibration_period_days || 365);
  const diff = differenceInDays(next, new Date());
  if (diff < 0) return { label: 'Vencido', color: 'bg-red-500', text: 'text-white shadow-red-200' };
  if (diff <= 30) return { label: 'Próximo', color: 'bg-orange-400', text: 'text-white shadow-orange-200' };
  return { label: 'Vigente', color: 'bg-green-500', text: 'text-white shadow-green-200' };
};

type ViewMode = 'day' | 'week' | 'month';

export function ProgramaCalibracion() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [schedule, setSchedule] = useState<CalibrationScheduleItem[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Manual Form State
  const [newManual, setNewManual] = useState({
    equipment_id: '',
    scheduled_date: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sData, eData] = await Promise.all([
        scheduleService.getSchedule(),
        equipmentService.getAll()
      ]);
      setSchedule(sData);
      setEquipmentList(eData);
    } catch (error) {
      console.error('Error fetching:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAutoGenerate = async () => {
    if (equipmentList.length === 0) {
      alert("No hay equipos activos con periodos de calibración configurados.");
      return;
    }
    
    setIsGenerating(true);
    let createdCount = 0;
    const localSchedule = [...schedule];
    try {
      for (const e of equipmentList) {
        if (e.status === 'active' && (e.calibration_period_days || 0) > 0) {
          const lastDate = e.last_calibration_date ? new Date(e.last_calibration_date) : new Date();
          const nextDate = addDays(lastDate, e.calibration_period_days);
          
          const isAlreadyScheduled = localSchedule.some(s => s.equipment_id === e.id && isSameDay(new Date(s.scheduled_date), nextDate));
          
          if (!isAlreadyScheduled) {
            const newItem = await scheduleService.createScheduleItem({
              equipment_id: e.id,
              scheduled_date: format(nextDate, 'yyyy-MM-dd'),
              type: 'automatic',
              status: 'scheduled',
              work_order_no: `WO-${(e.internal_id || 'EQ').split(' ')[0]}-${Date.now().toString().slice(-4)}`
            });
            localSchedule.push(newItem);
            createdCount++;
          }
        }
      }
      if (createdCount > 0) {
        alert(`${createdCount} nuevas órdenes de trabajo generadas correctamente.`);
        fetchData();
      } else {
        alert("No se encontraron nuevas fechas para programar.");
      }
    } catch (error) {
      console.error('Error generating:', error);
      alert('Error en generación automática. Verifica la conexión a Supabase.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await scheduleService.createScheduleItem({
        ...newManual,
        type: 'manual',
        status: 'scheduled',
        work_order_no: `MAN-${Date.now().toString().slice(-6)}`
      });
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Manual error:', error);
      alert('Error al programar manualmente.');
    }
  };

  // View data calculation
  const viewDays = useMemo(() => {
    if (viewMode === 'month') {
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    } else {
      return [currentDate];
    }
  }, [currentDate, viewMode]);

  const getEventsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events: any[] = [];

    equipmentList.forEach(e => {
      // Show equipment that are active, pending calibration or even in maintenance
      // Only hide if specifically 'out_of_service'
      if (e.status !== 'out_of_service' && e.last_calibration_date && (e.calibration_period_days || 0) > 0) {
        
        // Use a safer date parsing (manual to avoid TZ shifts for YYYY-MM-DD strings)
        const [year, month, day] = e.last_calibration_date.split('-').map(Number);
        const lastDate = new Date(year, month - 1, day);
        const nextDate = addDays(lastDate, e.calibration_period_days);
        const nextDateStr = format(nextDate, 'yyyy-MM-dd');

        if (nextDateStr === dateStr) {
          const realEvent = schedule.find(s => s.equipment_id === e.id);
          
          if (realEvent) {
             events.push({
                ...realEvent,
                scheduled_date: nextDateStr,
                equipment: e
             });
          } else {
             events.push({
                id: `suggested-${e.id}`,
                equipment_id: e.id,
                scheduled_date: nextDateStr,
                status: 'suggested' as const,
                work_order_no: 'Sugerida',
                equipment: e
             });
          }
        }
      }
    });

    return events;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-800">Programa de Calibraciones</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Planificación estratégica de la trazabilidad metrológica.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button 
            onClick={handleAutoGenerate}
            disabled={isGenerating}
            className={clsx(
              "rounded-[1.25rem] h-13 px-8 font-black flex items-center gap-3 transition-all active:scale-95 text-white shadow-xl shadow-slate-200",
              isGenerating ? "bg-slate-300" : "bg-slate-900"
            )}
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
            PROGRAMACIÓN INTELIGENTE
          </Button>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="rounded-[1.25rem] h-13 px-8 font-black flex items-center gap-3 shadow-xl shadow-primary/20 bg-primary border-none transition-all hover:scale-[1.03] active:scale-95 text-white"
          >
            <Plus className="w-5 h-5 stroke-[3px]" />
            PROGRAMA MANUAL
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
         <div className="lg:col-span-3 space-y-6">
            <Card className="rounded-[2.5rem] border-none bg-white p-6 shadow-sm flex flex-col h-[calc(100vh-220px)] overflow-hidden">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-4">
                  <div className="flex items-center gap-4">
                     <div className="bg-primary/5 p-3.5 rounded-2xl text-primary border border-primary/10">
                        <CalendarIcon className="w-6 h-6" />
                     </div>
                     <div className="flex flex-col">
                        <h2 className="text-xl font-black text-slate-800 capitalize leading-tight">
                           {format(currentDate, viewMode === 'day' ? 'dd MMMM yyyy' : 'MMMM yyyy', { locale: es })}
                        </h2>
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">Vista {viewMode === 'month' ? 'Mensual' : viewMode === 'week' ? 'Semanal' : 'Diaria'}</span>
                     </div>
                  </div>

                  <div className="flex items-center gap-4">
                     <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                        {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
                           <button
                             key={mode}
                             onClick={() => setViewMode(mode)}
                             className={clsx(
                                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                viewMode === mode ? "bg-white text-slate-800 shadow-sm border border-slate-100" : "text-slate-400 hover:text-slate-600"
                             )}
                           >
                             {mode === 'day' ? 'Día' : mode === 'week' ? 'Semana' : 'Mes'}
                           </button>
                        ))}
                     </div>

                     <div className="h-8 w-px bg-slate-100" />

                     <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-3 text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-all rounded-xl active:scale-90 border border-transparent hover:border-slate-100">
                           <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-[10px] font-black text-slate-800 hover:bg-slate-50 rounded-lg transition-all border border-slate-100">Hoy</button>
                        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-3 text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-all rounded-xl active:scale-90 border border-transparent hover:border-slate-100">
                           <ChevronRight className="w-6 h-6" />
                        </button>
                     </div>
                  </div>
               </div>

               {loading ? (
                 <div className="flex flex-col items-center justify-center py-40 gap-4">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Sincronizando programa...</p>
                 </div>
               ) : (
                 <div className={clsx(
                    "grid gap-2 h-full overflow-y-auto pr-1 flex-1 custom-scrollbar",
                    viewMode === 'month' ? "grid-cols-7" : viewMode === 'week' ? "grid-cols-7" : "grid-cols-1"
                 )}>
                    {viewMode !== 'day' && (['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']).map(d => (
                      <div key={d} className="text-center text-[9px] font-black text-slate-300 uppercase tracking-widest pb-2">{d}</div>
                    ))}
                    
                    {viewDays.map((date, i) => {
                      const events = getEventsForDay(date);
                      const isToday = isSameDay(date, new Date());
                      const isOtherMonth = viewMode === 'month' && format(date, 'MM') !== format(currentDate, 'MM');

                      return (
                        <div 
                          key={i} 
                          className={clsx(
                            "min-h-[90px] rounded-[1.5rem] p-3 border transition-all flex flex-col gap-1.5 relative group",
                            isToday ? "ring-1 ring-primary bg-white shadow-xl shadow-primary/5" : "bg-white border-slate-50 hover:border-primary/20",
                            isOtherMonth && "opacity-30",
                            viewMode === 'day' && "max-w-2xl mx-auto w-full min-h-[400px] p-8"
                          )}
                        >
                           <div className="flex items-center justify-between mb-1">
                              <span className={clsx("text-base font-black transition-colors", 
                                 isToday ? "text-primary" : isOtherMonth ? "text-slate-200" : "text-slate-300 group-hover:text-slate-800")
                              }>
                                {format(date, 'd')}
                              </span>
                           </div>

                           <div className="space-y-1.5 mt-1 overflow-hidden">
                              {events.map((e) => {
                                const metStatus = e.equipment ? getMetrologicalStatus(e.equipment) : { color: 'bg-slate-200', text: 'text-slate-600' };
                                return (
                                  <Card 
                                    key={e.id}
                                    onClick={(event) => {
                                       event.stopPropagation();
                                       setSelectedEvent(e);
                                       setIsDetailModalOpen(true);
                                    }}
                                    className={clsx(
                                       "p-1.5 rounded-xl border-none flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-lg group/event", 
                                       metStatus.color,
                                       metStatus.text,
                                       e.status === 'suggested' && "opacity-80 border-2 border-dashed border-white/30"
                                    )}
                                  >
                                     <div className="flex flex-col min-w-0 flex-1 text-center">
                                        <span className="text-[10px] font-black uppercase truncate leading-tight tracking-widest drop-shadow-sm">
                                           {e.equipment?.internal_id || 'S/N'}
                                        </span>
                                     </div>
                                  </Card>
                                );
                              })}
                           </div>
                        </div>
                      );
                    })}
                 </div>
               )}
            </Card>
         </div>

          <div className="lg:col-span-1 flex flex-col gap-6 h-[calc(100vh-220px)] overflow-hidden">
             <Card className="p-6 rounded-[2rem] border-none bg-white shadow-sm flex-1 flex flex-col justify-center">
               <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-orange-500" />
                  Estado del Mes
               </h3>
               <div className="space-y-3">
                  <div className="p-3 rounded-2xl flex items-center justify-between bg-slate-50 border border-slate-100">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Programadas</span>
                     <span className="text-xl font-black text-slate-800">{schedule.length}</span>
                  </div>
                  <div className="p-3 rounded-2xl flex items-center justify-between bg-green-50 border border-green-100">
                     <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Completadas</span>
                     <span className="text-xl font-black text-green-600">0</span>
                  </div>
                  <div className="p-3 rounded-2xl flex items-center justify-between bg-red-50 border border-red-100">
                     <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Vencidas</span>
                     <span className="text-xl font-black text-red-600">0</span>
                  </div>
               </div>
            </Card>

            <Card className="rounded-[2rem] bg-slate-900 shadow-xl p-6 shadow-slate-200 flex-1 flex flex-col overflow-hidden">
                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-3">
                   <AlertCircle className="w-5 h-5 text-orange-400" />
                   Próximas Tareas
                </h3>
                <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {schedule.slice(0, 5).map(e => (
                    <div key={e.id} className="bg-white/10 p-2.5 rounded-xl border border-white/5 hover:bg-white/10 transition-all group">
                       <div className="flex items-start gap-3">
                          <div className="bg-primary/20 p-2 rounded-xl">
                             <FileText className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="text-[11px] font-black text-white leading-tight truncate">{e.work_order_no}</p>
                             <p className="text-[9px] font-bold text-slate-400 truncate mt-0.5">{e.equipment?.name}</p>
                          </div>
                       </div>
                    </div>
                  ))}
                  {schedule.length === 0 && <p className="text-[10px] font-bold text-slate-500 text-center py-8">No hay órdenes para este mes.</p>}
               </div>
               <Button className="w-full mt-4 h-10 rounded-xl font-black text-[9px] bg-white text-slate-900 border-none hover:bg-slate-50 transition-all">VER TODAS</Button>
            </Card>
         </div>
      </div>

      {/* MANUAL MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Programación Manual">
         <form onSubmit={handleManualSubmit} className="space-y-6">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Seleccionar Equipo</label>
               <select 
                 required 
                 className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                 value={newManual.equipment_id}
                 onChange={(e) => setNewManual({...newManual, equipment_id: e.target.value})}
               >
                 <option value="">Seleccione instrumento...</option>
                 {equipmentList.map(e => (
                   <option key={e.id} value={e.id}>{e.internal_id} - {e.name}</option>
                 ))}
               </select>
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Fecha de Calibración</label>
               <input 
                 type="date" 
                 required 
                 className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                 value={newManual.scheduled_date}
                 onChange={(e) => setNewManual({...newManual, scheduled_date: e.target.value})}
               />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Notas / Observaciones</label>
               <textarea 
                 className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none min-h-[100px]"
                 value={newManual.notes}
                 onChange={(e) => setNewManual({...newManual, notes: e.target.value})}
               />
            </div>
            <div className="flex gap-4 pt-4">
               <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-13 rounded-2xl font-black border-slate-200">CANCELAR</Button>
               <Button type="submit" className="flex-1 h-13 rounded-2xl font-black bg-primary text-white shadow-xl shadow-primary/20">CONFIRMAR FECHA</Button>
            </div>
         </form>
      </Modal>

      {/* EQUIPMENT DETAIL MODAL */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Detalles del Instrumento">
         {selectedEvent && selectedEvent.equipment && (
            <div className="space-y-8">
               <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm">
                     {selectedEvent.equipment.image_url ? (
                        <img src={selectedEvent.equipment.image_url} alt="" className="w-16 h-16 object-contain" />
                     ) : (
                        <Monitor className="w-10 h-10 text-slate-200" />
                     )}
                  </div>
                  <div className="flex-1">
                     <h3 className="text-xl font-black text-slate-800 leading-tight">{selectedEvent.equipment.name}</h3>
                     <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">{selectedEvent.equipment.magnitude?.name}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedEvent.equipment.internal_id}</span>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-white border border-slate-100 rounded-3xl space-y-1">
                     <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                        <Tag className="w-3 h-3" /> Marca
                     </span>
                     <p className="text-sm font-bold text-slate-700">{selectedEvent.equipment.brand || '---'}</p>
                  </div>
                  <div className="p-5 bg-white border border-slate-100 rounded-3xl space-y-1">
                     <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                        <Settings className="w-3 h-3" /> Modelo
                     </span>
                     <p className="text-sm font-bold text-slate-700">{selectedEvent.equipment.model || '---'}</p>
                  </div>
                  <div className="p-5 bg-white border border-slate-100 rounded-3xl space-y-1">
                     <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                        <Hash className="w-3 h-3" /> Serie
                     </span>
                     <p className="text-sm font-bold text-slate-700">{selectedEvent.equipment.serial_number || '---'}</p>
                  </div>
                  <div className="p-5 bg-white border border-slate-100 rounded-3xl space-y-1">
                     <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                        <CalendarDays className="w-3 h-3" /> Próxima Cal.
                     </span>
                     <p className="text-sm font-black text-slate-900">{format(new Date(selectedEvent.scheduled_date), "dd 'de' MMMM", { locale: es })}</p>
                  </div>
               </div>

               <div className="p-6 rounded-[2rem] border border-primary/20 bg-primary/5 flex items-center justify-between">
                  {(() => {
                     const status = getMetrologicalStatus(selectedEvent.equipment);
                     return (
                        <>
                           <div className="flex flex-col">
                              <span className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Estado Metrológico</span>
                              <span className="text-lg font-black text-slate-800 uppercase">{status.label}</span>
                           </div>
                           <div className={clsx("px-5 py-2 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest shadow-lg", status.color)}>
                              ACTIVO
                           </div>
                        </>
                     );
                  })()}
               </div>

               <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setIsDetailModalOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest">CERRAR</Button>
                  <Button className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-slate-900 text-white shadow-xl">VER EXPEDIENTE</Button>
               </div>
            </div>
         )}
      </Modal>
    </div>
  );
}
