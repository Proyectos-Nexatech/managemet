import { useState, useEffect } from 'react';
import { RefreshCw, Plus, Calendar, Clock, ChevronRight, Loader2, Users, ArrowRightLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '../components/ui/Modal';
import { intermediateChecksService, type IntermediateCheck } from '../services/intermediateChecks';
import { equipmentService, type Equipment } from '../services/equipment';
import clsx from 'clsx';
import { isAfter, parseISO } from 'date-fns';

export function IntermediateChecks() {
  const [checks, setChecks] = useState<IntermediateCheck[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [newCheck, setNewCheck] = useState<Partial<IntermediateCheck>>({
    equipment_id: '',
    reference_standard_id: '',
    work_standard_id: '',
    next_check_date: '',
    status: 'pending'
  });

  const fetchData = async () => {
    try {
      try {
        const eData = await equipmentService.getAll();
        setEquipment(eData);
      } catch (e) {
        console.error('Error fetching equipment:', e);
      }

      try {
        const cData = await intermediateChecksService.getAll();
        setChecks(cData);
      } catch (e: any) {
        console.error('Error fetching checks:', e);
      }
    } finally {
      // Done
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await intermediateChecksService.create(newCheck);
      setIsModalOpen(false);
      fetchData();
      setNewCheck({
        equipment_id: '',
        reference_standard_id: '',
        work_standard_id: '',
        next_check_date: '',
        status: 'pending'
      });
    } catch (error) {
      console.error('Error creating check:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Comprobaciones Intermedias</h1>
            <p className="text-sm font-bold text-slate-400">Verificaciones cruzadas y estabilidad de patrones</p>
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 rounded-2xl font-black bg-teal-600 text-white shadow-lg shadow-teal-200 h-12 px-6">
          <Plus className="w-5 h-5" /> Programar Verificación
        </Button>
      </div>

      {/* Scheduler Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-800 tracking-tight">Calendario de Actividades</h2>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-teal-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Programado</span>
              </div>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="text-left py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipo</th>
                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patrones (Ref vs Trab)</th>
                    <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Programada</th>
                    <th className="text-right py-4 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {checks.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-20 text-center">
                        <Calendar className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                        <p className="text-sm font-bold text-slate-400">No hay verificaciones programadas</p>
                      </td>
                    </tr>
                  ) : (
                    checks.map(check => {
                      const isOverdue = check.status === 'pending' && check.next_check_date && isAfter(new Date(), parseISO(check.next_check_date));
                      return (
                        <tr key={check.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="py-6 px-8">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-800">{check.equipment?.name}</span>
                              <span className="text-[10px] font-bold text-slate-400">{check.equipment?.internal_id}</span>
                            </div>
                          </td>
                          <td className="py-6 px-6">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                               <ArrowRightLeft className="w-3.5 h-3.5 text-teal-500" />
                               Verificación Cruzada
                            </div>
                          </td>
                          <td className="py-6 px-6">
                            <div className="flex flex-col">
                              <span className={clsx(
                                "text-sm font-black",
                                isOverdue ? "text-red-500" : "text-slate-700"
                              )}>
                                {check.next_check_date}
                              </span>
                              {isOverdue && <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">Vencida</span>}
                            </div>
                          </td>
                          <td className="py-6 px-8 text-right">
                             <Button variant="ghost" className="rounded-xl font-bold text-teal-600 hover:bg-teal-50">
                               Ejecutar <ChevronRight className="w-4 h-4 ml-1" />
                             </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
           <Card className="p-8 rounded-[2.5rem] border-none shadow-sm bg-slate-900 text-white">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/20 flex items-center justify-center text-teal-400 mb-6">
                 <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black tracking-tight mb-2">Próximo Control</h3>
              <p className="text-xs font-bold text-slate-400 mb-6">Mantenga la estabilidad metrológica entre periodos de calibración formal.</p>
              
              <div className="space-y-4">
                 <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-1">Última Realizada</p>
                    <p className="text-sm font-bold">{checks.find(c => c.status === 'completed')?.check_date || 'N/A'}</p>
                 </div>
                 <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest mb-1">Total Pendientes</p>
                    <p className="text-2xl font-black">{checks.filter(c => c.status === 'pending').length}</p>
                 </div>
              </div>
           </Card>

           <Card className="p-8 rounded-[2.5rem] border-none shadow-sm bg-white border border-slate-50">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <Users className="w-4 h-4 text-teal-500" /> Responsables
              </h4>
              <div className="flex flex-col gap-4">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400">HG</div>
                    <div>
                       <p className="text-xs font-black text-slate-800">Harold Gil</p>
                       <p className="text-[10px] font-bold text-slate-400">Director Técnico</p>
                    </div>
                 </div>
              </div>
           </Card>
        </div>
      </div>

      {/* Schedule Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Programar Nueva Verificación Intermedia">
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipo / Patrón *</label>
              <select required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none"
                value={newCheck.equipment_id} onChange={e => setNewCheck({ ...newCheck, equipment_id: e.target.value })}>
                <option value="">Seleccione instrumento</option>
                {equipment.map(e => <option key={e.id} value={e.id}>{e.internal_id} - {e.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patrón Referencia</label>
              <select className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none"
                value={newCheck.reference_standard_id || ''} onChange={e => setNewCheck({ ...newCheck, reference_standard_id: e.target.value })}>
                <option value="">Seleccione patrón</option>
                {equipment.filter(e => e.classification === 'Equipo de Referencia').map(e => <option key={e.id} value={e.id}>{e.internal_id} - {e.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Patrón Trabajo</label>
              <select className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none"
                value={newCheck.work_standard_id || ''} onChange={e => setNewCheck({ ...newCheck, work_standard_id: e.target.value })}>
                <option value="">Seleccione patrón</option>
                {equipment.filter(e => e.classification === 'Equipo de Trabajo').map(e => <option key={e.id} value={e.id}>{e.internal_id} - {e.name}</option>)}
              </select>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha de Ejecución Programada</label>
              <input type="date" required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none"
                value={newCheck.next_check_date || ''} onChange={e => setNewCheck({ ...newCheck, next_check_date: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-xl font-black bg-teal-600 text-white px-8">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Programar Actividad'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
