import { useState, useEffect } from 'react';
import { ClipboardCheck, Plus, CheckCircle2, XCircle, Loader2, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '../components/ui/Modal';
import { certificateAcceptanceService, type CertificateAcceptance } from '../services/certificateAcceptance';
import { equipmentService, type Equipment } from '../services/equipment';
import { useAuth } from '../contexts/AuthContext';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';

export function CertificateAcceptance() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [acceptances, setAcceptances] = useState<CertificateAcceptance[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedAcceptance, setSelectedAcceptance] = useState<CertificateAcceptance | null>(null);
  
  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAcceptance, setNewAcceptance] = useState<Partial<CertificateAcceptance>>({
    equipment_id: '',
    provider: '',
    certificate_number: '',
    calibration_date: '',
    evaluation_date: new Date().toISOString().split('T')[0],
    evaluated_by: profile?.id
  });

  const fetchData = async () => {
    try {
      
      // Fetch equipment regardless of acceptance table existence
      try {
        const eData = await equipmentService.getAll();
        setEquipment(eData);
      } catch (e) {
        console.error('Error fetching equipment:', e);
      }

      // Fetch acceptances separately
      try {
        const aData = await certificateAcceptanceService.getAll();
        setAcceptances(aData);
      } catch (e: any) {
        console.error('Error fetching acceptances:', e);
        if (e.code === 'PGRST204') {
          console.warn('AVISO: La tabla "certificate_acceptances" no existe. Asegúrese de ejecutar el script SQL de migración.');
        }
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
      const created = await certificateAcceptanceService.create({
        ...newAcceptance,
        evaluated_by: profile?.id
      });
      setIsModalOpen(false);
      fetchData();
      // Open details of the newly created to fill the checklist
      handleViewDetail(created.id);
    } catch (error) {
      console.error('Error creating acceptance:', error);
      alert('Error al crear la aceptación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const detail = await certificateAcceptanceService.getById(id);
      setSelectedAcceptance(detail);
      setIsDetailOpen(true);
    } catch (error) {
      console.error('Error fetching detail:', error);
    }
  };

  const handleUpdateCheckItem = async (itemId: string, result: 'SI' | 'NO' | 'NA') => {
    if (!selectedAcceptance) return;
    try {
      await certificateAcceptanceService.updateChecklistItem(itemId, result);
      // Refresh local state for immediate UI update
      const updatedChecklist = selectedAcceptance.checklist?.map(item => 
        item.id === itemId ? { ...item, result } : item
      );
      setSelectedAcceptance({ ...selectedAcceptance, checklist: updatedChecklist });
    } catch (error) {
      console.error('Error updating checklist item:', error);
    }
  };

  const handleEvaluate = async () => {
    if (!selectedAcceptance) return;
    
    // Check if any critical NO
    const hasCriticalNo = selectedAcceptance.checklist?.some(item => item.is_critical && item.result === 'NO');
    const hasUnfilled = selectedAcceptance.checklist?.some(item => item.result === 'NA');

    if (hasUnfilled && !confirm('Hay puntos marcados como NA. ¿Deseas proceder con la evaluación?')) return;

    let observations = selectedAcceptance.observations || '';
    if (hasCriticalNo && !observations) {
      const obs = prompt('Puntos críticos fallidos. Ingrese observaciones obligatorias para el rechazo:');
      if (!obs) return;
      observations = obs;
    }

    setIsSubmitting(true);
    try {
      const status = await certificateAcceptanceService.evaluateAcceptance(selectedAcceptance.id, observations);
      alert(`Certificado ${status === 'accepted' ? 'ACEPTADO' : 'RECHAZADO'}`);
      setIsDetailOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error evaluating:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Aceptación de Certificados</h1>
            <p className="text-sm font-bold text-slate-400">Validación documental bajo R-LAB-4 (ISO 17025)</p>
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 rounded-2xl font-black bg-primary text-white shadow-lg shadow-primary/20 h-12 px-6">
          <Plus className="w-5 h-5" /> Nueva Evaluación
        </Button>
      </div>

      {/* Stats / Quick Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 rounded-[2rem] border-none shadow-sm bg-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500">
            <Loader2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pendientes</p>
            <p className="text-2xl font-black text-slate-800">{acceptances.filter(a => a.status === 'pending').length}</p>
          </div>
        </Card>
        <Card className="p-6 rounded-[2rem] border-none shadow-sm bg-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aceptados</p>
            <p className="text-2xl font-black text-slate-800">{acceptances.filter(a => a.status === 'accepted').length}</p>
          </div>
        </Card>
        <Card className="p-6 rounded-[2rem] border-none shadow-sm bg-white flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rechazados</p>
            <p className="text-2xl font-black text-slate-800">{acceptances.filter(a => a.status === 'rejected').length}</p>
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="text-left py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Instrumento / Certificado</th>
                <th className="text-left py-6 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Proveedor</th>
                <th className="text-left py-6 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Cal.</th>
                <th className="text-left py-6 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                <th className="text-right py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {acceptances.map(acc => (
                <tr key={acc.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="py-6 px-8">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">{acc.equipment?.internal_id}</span>
                      <span className="text-sm font-black text-slate-800">{acc.equipment?.name}</span>
                      <span className="text-[10px] font-bold text-slate-400">Cert: {acc.certificate_number}</span>
                    </div>
                  </td>
                  <td className="py-6 px-6 text-sm font-bold text-slate-600">{acc.provider}</td>
                  <td className="py-6 px-6 text-sm font-bold text-slate-500">{acc.calibration_date}</td>
                  <td className="py-6 px-6">
                    <div className={clsx(
                      "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider",
                      acc.status === 'accepted' ? "bg-green-50 text-green-600 border-green-100" :
                      acc.status === 'rejected' ? "bg-red-50 text-red-600 border-red-100" :
                      "bg-orange-50 text-orange-600 border-orange-100"
                    )}>
                      {acc.status === 'accepted' ? <CheckCircle2 className="w-3.5 h-3.5" /> : 
                       acc.status === 'rejected' ? <XCircle className="w-3.5 h-3.5" /> : 
                       <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {acc.status}
                    </div>
                  </td>
                  <td className="py-6 px-8 text-right">
                    <Button variant="ghost" onClick={() => handleViewDetail(acc.id)} className="rounded-xl font-bold text-primary hover:bg-primary/5">
                      {acc.status === 'pending' ? 'Completar Checklist' : 'Ver Detalles'}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Acceptance Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva Evaluación de Certificado">
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipo *</label>
              <select required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none"
                value={newAcceptance.equipment_id} onChange={e => setNewAcceptance({ ...newAcceptance, equipment_id: e.target.value })}>
                <option value="">Seleccione equipo</option>
                {equipment.map(e => <option key={e.id} value={e.id}>{e.internal_id} - {e.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proveedor (Laboratorio)</label>
              <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none"
                value={newAcceptance.provider} onChange={e => setNewAcceptance({ ...newAcceptance, provider: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. Certificado</label>
              <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none"
                value={newAcceptance.certificate_number} onChange={e => setNewAcceptance({ ...newAcceptance, certificate_number: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Calibración</label>
              <input type="date" required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none"
                value={newAcceptance.calibration_date} onChange={e => setNewAcceptance({ ...newAcceptance, calibration_date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Evaluación</label>
              <input type="date" required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none"
                value={newAcceptance.evaluation_date} onChange={e => setNewAcceptance({ ...newAcceptance, evaluation_date: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-xl font-black bg-primary text-white px-8">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear y Continuar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detail & Checklist Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Checklist R-LAB-4: Aceptación de Certificado" maxWidthClass="max-w-4xl">
        {selectedAcceptance && (
          <div className="space-y-6">
            <div className="p-6 bg-slate-50 rounded-3xl grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Instrumento</p>
                <p className="text-sm font-black text-slate-800">{selectedAcceptance.equipment?.name}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Certificado</p>
                <p className="text-sm font-black text-slate-800">{selectedAcceptance.certificate_number}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</p>
                <p className={clsx("text-sm font-black uppercase", 
                  selectedAcceptance.status === 'accepted' ? "text-green-600" : 
                  selectedAcceptance.status === 'rejected' ? "text-red-600" : "text-orange-600"
                )}>{selectedAcceptance.status}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Puntos de Control (ISO 17025)</h3>
                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Crítico</span>
                </div>
              </div>

              <div className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white shadow-sm z-10">
                    <tr>
                      <th className="text-left py-2 text-[10px] font-black text-slate-400 uppercase"># Punto</th>
                      <th className="text-left py-2 text-[10px] font-black text-slate-400 uppercase">Descripción</th>
                      <th className="text-center py-2 text-[10px] font-black text-slate-400 uppercase">Cumplimiento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {selectedAcceptance.checklist?.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-3 text-xs font-bold text-slate-400">{item.item_number}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            {item.is_critical && <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />}
                            <span className="text-xs font-bold text-slate-700">{item.description}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center justify-center gap-1">
                            {['SI', 'NO', 'NA'].map(res => (
                              <button
                                key={res}
                                disabled={selectedAcceptance.status !== 'pending'}
                                onClick={() => handleUpdateCheckItem(item.id, res as any)}
                                className={clsx(
                                  "w-10 h-8 rounded-lg text-[10px] font-black transition-all",
                                  item.result === res 
                                    ? (res === 'SI' ? "bg-green-500 text-white" : res === 'NO' ? "bg-red-500 text-white" : "bg-slate-500 text-white")
                                    : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                )}
                              >
                                {res}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedAcceptance.status === 'pending' ? (
              <div className="flex flex-col gap-4 border-t border-slate-100 pt-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Observaciones Finales</label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none h-24"
                    placeholder="Ingrese comentarios sobre la validación..."
                    value={selectedAcceptance.observations || ''}
                    onChange={e => setSelectedAcceptance({ ...selectedAcceptance, observations: e.target.value })}
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button variant="ghost" onClick={() => setIsDetailOpen(false)} className="rounded-xl font-bold">Cerrar</Button>
                  <Button onClick={handleEvaluate} disabled={isSubmitting} className="rounded-xl font-black bg-primary text-white px-8 shadow-lg shadow-primary/20">
                    Finalizar Evaluación
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                <div className="flex items-center gap-3">
                   <div className={clsx("p-3 rounded-2xl", selectedAcceptance.status === 'accepted' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                      {selectedAcceptance.status === 'accepted' ? <CheckCircle2 /> : <XCircle />}
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">Dictamen Final</p>
                      <p className="text-sm font-black text-slate-800 uppercase">{selectedAcceptance.status}</p>
                   </div>
                </div>
                {selectedAcceptance.status === 'accepted' && (
                  <Button 
                    onClick={() => navigate(`/confirmacion-metrologica?acceptance=${selectedAcceptance.id}`)}
                    className="gap-2 rounded-2xl font-black bg-slate-800 text-white h-12 px-6"
                  >
                    Proceder a Confirmación Metrológica <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
