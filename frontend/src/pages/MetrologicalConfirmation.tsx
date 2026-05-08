import { useState, useEffect } from 'react';
import { Activity, Plus, Calculator, CheckCircle2, AlertTriangle, ChevronRight, Loader2, ShieldCheck, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '../components/ui/Modal';
import { metrologicalConfirmationService, type MetrologicalConfirmation } from '../services/metrologicalConfirmation';
import { equipmentService, type Equipment } from '../services/equipment';
import { magnitudesService, type Magnitude } from '../services/magnitudes';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';

export function MetrologicalConfirmation() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [confirmations, setConfirmations] = useState<MetrologicalConfirmation[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [magnitudes, setMagnitudes] = useState<Magnitude[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedConfirmation, setSelectedConfirmation] = useState<MetrologicalConfirmation | null>(null);

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newConfirmation, setNewConfirmation] = useState<Partial<MetrologicalConfirmation>>({
    equipment_id: '',
    acceptance_id: searchParams.get('acceptance') || '',
    use_range_min: 0,
    use_range_max: 0,
    emp_formula: '',
    emp_description: '',
    confirmation_date: new Date().toISOString().split('T')[0],
    confirmed_by: profile?.id
  });

  // Result Row State
  const [newResult, setNewResult] = useState({
    nominal_value: 0,
    standard_value: 0,
    instrument_value: 0
  });

  const fetchData = async () => {
    try {
      try {
        const [eData, mData] = await Promise.all([
          equipmentService.getAll(),
          magnitudesService.getAll()
        ]);
        setEquipment(eData);
        setMagnitudes(mData);
      } catch (e) {
        console.error('Error fetching baseline data:', e);
      }

      try {
        const cData = await metrologicalConfirmationService.getAll();
        setConfirmations(cData);
      } catch (e: any) {
        console.error('Error fetching confirmations:', e);
      }

      const acceptanceId = searchParams.get('acceptance');
      if (acceptanceId) {
        setIsModalOpen(true);
      }
    } finally {
      // Done
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchParams]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const created = await metrologicalConfirmationService.create({
        ...newConfirmation,
        confirmed_by: profile?.id
      });
      setIsModalOpen(false);
      fetchData();
      handleViewDetail(created.id);
    } catch (error) {
      console.error('Error creating:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const detail = await metrologicalConfirmationService.getById(id);
      setSelectedConfirmation(detail);
      setIsDetailOpen(true);
    } catch (error) {
      console.error('Error fetching detail:', error);
    }
  };

  const handleAddResult = async () => {
    if (!selectedConfirmation) return;
    try {
      const error = newResult.instrument_value - newResult.standard_value;
      const emp = metrologicalConfirmationService.evaluateEMP(selectedConfirmation.emp_formula || '0', newResult.nominal_value);
      
      await metrologicalConfirmationService.addResult({
        confirmation_id: selectedConfirmation.id,
        point_number: (selectedConfirmation.results?.length || 0) + 1,
        ...newResult,
        error,
        emp,
        is_conforming: Math.abs(error) <= emp
      });
      
      setNewResult({ nominal_value: 0, standard_value: 0, instrument_value: 0 });
      handleViewDetail(selectedConfirmation.id); // Refresh detail
    } catch (error) {
      console.error('Error adding result:', error);
    }
  };

  const handleRecalculate = async () => {
    if (!selectedConfirmation || !selectedConfirmation.emp_formula) return;
    setIsSubmitting(true);
    try {
      await metrologicalConfirmationService.calculateAndSaveResults(selectedConfirmation.id, selectedConfirmation.emp_formula);
      handleViewDetail(selectedConfirmation.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyException = async (resultId: string) => {
    const justification = prompt('Ingrese justificación para esta excepción (ej: Equipo se usa solo en rango 4-20mA):');
    if (!justification) return;
    try {
      await metrologicalConfirmationService.applyException(resultId, justification);
      handleViewDetail(selectedConfirmation!.id);
    } catch (error) {
      console.error('Error applying exception:', error);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Confirmación Metrológica</h1>
            <p className="text-sm font-bold text-slate-400">Motor de cálculos y validación de requisitos (R-LAB-5)</p>
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 rounded-2xl font-black bg-indigo-600 text-white shadow-lg shadow-indigo-200 h-12 px-6">
          <Plus className="w-5 h-5" /> Nueva Confirmación
        </Button>
      </div>

      {/* List */}
      <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="text-left py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipo</th>
                <th className="text-left py-6 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Magnitud / Rango</th>
                <th className="text-left py-6 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fórmula EMP</th>
                <th className="text-left py-6 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Resultado</th>
                <th className="text-right py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {confirmations.map(conf => (
                <tr key={conf.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="py-6 px-8">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{conf.equipment?.internal_id}</span>
                      <span className="text-sm font-black text-slate-800">{conf.equipment?.name}</span>
                      <span className="text-[10px] font-bold text-slate-400">{conf.equipment?.brand} {conf.equipment?.model}</span>
                    </div>
                  </td>
                  <td className="py-6 px-6">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700">{conf.magnitude?.name}</span>
                      <span className="text-[10px] font-bold text-slate-400">{conf.use_range_min} a {conf.use_range_max}</span>
                    </div>
                  </td>
                  <td className="py-6 px-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Requisito:</span>
                      <span className="text-xs font-bold text-slate-700 font-mono">{conf.emp_formula}</span>
                    </div>
                  </td>
                  <td className="py-6 px-6">
                    <div className={clsx(
                      "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider",
                      conf.status === 'conforme' ? "bg-green-50 text-green-600 border-green-100" :
                      conf.status === 'apto_con_restricciones' ? "bg-amber-50 text-amber-600 border-amber-100" :
                      "bg-red-50 text-red-600 border-red-100"
                    )}>
                      {conf.status === 'conforme' ? <CheckCircle2 className="w-3.5 h-3.5" /> : 
                       conf.status === 'apto_con_restricciones' ? <ShieldCheck className="w-3.5 h-3.5" /> : 
                       <AlertTriangle className="w-3.5 h-3.5" />}
                      {conf.status.replace(/_/g, ' ')}
                    </div>
                  </td>
                  <td className="py-6 px-8 text-right">
                    <Button variant="ghost" onClick={() => handleViewDetail(conf.id)} className="rounded-xl font-bold text-indigo-600 hover:bg-indigo-50">
                      Ver Cálculos <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nueva Confirmación Metrológica">
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipo a Confirmar *</label>
              <select required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none"
                value={newConfirmation.equipment_id} onChange={e => setNewConfirmation({ ...newConfirmation, equipment_id: e.target.value })}>
                <option value="">Seleccione equipo</option>
                {equipment.map(e => <option key={e.id} value={e.id}>{e.internal_id} - {e.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Magnitud</label>
              <select required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none"
                value={newConfirmation.magnitude_id || ''} onChange={e => setNewConfirmation({ ...newConfirmation, magnitude_id: e.target.value })}>
                <option value="">Seleccione magnitud</option>
                {magnitudes.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rango de Uso (Mín - Máx)</label>
              <div className="flex items-center gap-2">
                <input type="number" step="any" placeholder="Min" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none"
                  value={newConfirmation.use_range_min || ''} onChange={e => setNewConfirmation({ ...newConfirmation, use_range_min: parseFloat(e.target.value) })} />
                <input type="number" step="any" placeholder="Max" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none"
                  value={newConfirmation.use_range_max || ''} onChange={e => setNewConfirmation({ ...newConfirmation, use_range_max: parseFloat(e.target.value) })} />
              </div>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fórmula EMP (Motor JS)</label>
              <input required placeholder="Ej: 0.00015 * reading + 0.000007" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black font-mono outline-none text-indigo-600"
                value={newConfirmation.emp_formula || ''} onChange={e => setNewConfirmation({ ...newConfirmation, emp_formula: e.target.value })} />
              <p className="text-[9px] font-bold text-slate-400 italic">Use 'reading' para representar el valor nominal.</p>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción del Requisito</label>
              <input required placeholder="Ej: 0,015% lectura + 7E-6 A" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none"
                value={newConfirmation.emp_description || ''} onChange={e => setNewConfirmation({ ...newConfirmation, emp_description: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-xl font-black bg-indigo-600 text-white px-8">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Inicializar Confirmación'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Resultados de Confirmación Metrológica" maxWidthClass="max-w-6xl">
        {selectedConfirmation && (
          <div className="space-y-8">
             {/* Master Data */}
             <div className="grid grid-cols-4 gap-4 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipo</p>
                  <p className="text-sm font-black text-slate-800 leading-tight">{selectedConfirmation.equipment?.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">S/N: {selectedConfirmation.equipment?.serial_number}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Magnitud</p>
                  <p className="text-sm font-black text-slate-800">{selectedConfirmation.magnitude?.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Rango: {selectedConfirmation.use_range_min} - {selectedConfirmation.use_range_max}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Fórmula EMP</p>
                  <p className="text-xs font-black font-mono text-indigo-700 bg-white px-3 py-1 rounded-lg border border-indigo-100 w-fit">{selectedConfirmation.emp_formula}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">{selectedConfirmation.emp_description}</p>
                </div>
             </div>

             {/* Results Grid */}
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-indigo-500" />
                    Puntos de Medición
                  </h3>
                  <Button onClick={handleRecalculate} disabled={isSubmitting} variant="outline" className="h-8 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2">
                    <Loader2 className={clsx("w-3 h-3", isSubmitting && "animate-spin")} /> Recalcular Todo
                  </Button>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-100 shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase">Nominal</th>
                        <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase">Valor Patrón</th>
                        <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase">Instrumento</th>
                        <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase">Error</th>
                        <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase">EMP</th>
                        <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase">Conformidad</th>
                        <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase">Restricción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {selectedConfirmation.results?.map(res => (
                        <tr key={res.id} className="hover:bg-slate-50/50">
                          <td className="py-4 px-6 text-sm font-black text-slate-700">{res.nominal_value}</td>
                          <td className="py-4 px-4 text-sm font-bold text-slate-500">{res.standard_value}</td>
                          <td className="py-4 px-4 text-sm font-bold text-slate-500">{res.instrument_value}</td>
                          <td className="py-4 px-4 text-sm font-black text-slate-800">{res.error.toFixed(6)}</td>
                          <td className="py-4 px-4 text-sm font-bold text-indigo-600">{res.emp.toFixed(6)}</td>
                          <td className="py-4 px-4">
                            <div className={clsx(
                              "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest w-fit",
                              res.is_conforming ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                            )}>
                              {res.is_conforming ? 'Conforme' : 'No Conforme'}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {!res.is_conforming && !res.is_exception ? (
                              <Button onClick={() => handleApplyException(res.id)} variant="ghost" className="h-8 rounded-xl text-[9px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100">
                                <Plus className="w-3 h-3 mr-1" /> Excepción
                              </Button>
                            ) : res.is_exception ? (
                              <div className="group relative cursor-help">
                                <div className="flex items-center gap-1 text-[9px] font-black text-amber-600">
                                  <ShieldCheck className="w-3.5 h-3.5" /> EXCEPTUADO
                                </div>
                                <div className="absolute bottom-full mb-2 left-0 w-48 p-2 bg-slate-800 text-white text-[9px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                                  {res.exception_justification}
                                </div>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                      {/* Input Row */}
                      <tr className="bg-indigo-50/30">
                        <td className="py-4 px-6">
                          <input type="number" step="any" className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-sm font-bold outline-none"
                            value={newResult.nominal_value || ''} onChange={e => setNewResult({ ...newResult, nominal_value: parseFloat(e.target.value) })} />
                        </td>
                        <td className="py-4 px-4">
                          <input type="number" step="any" className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-sm font-bold outline-none"
                            value={newResult.standard_value || ''} onChange={e => setNewResult({ ...newResult, standard_value: parseFloat(e.target.value) })} />
                        </td>
                        <td className="py-4 px-4">
                          <input type="number" step="any" className="w-full bg-white border border-indigo-100 rounded-xl px-3 py-2 text-sm font-bold outline-none"
                            value={newResult.instrument_value || ''} onChange={e => setNewResult({ ...newResult, instrument_value: parseFloat(e.target.value) })} />
                        </td>
                        <td colSpan={4} className="py-4 px-6">
                           <Button onClick={handleAddResult} className="rounded-xl font-black bg-indigo-600 text-white px-6 h-10 w-full shadow-lg shadow-indigo-200">
                              <Plus className="w-4 h-4 mr-2" /> Agregar Punto
                           </Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
             </div>

             {/* Footer Status */}
             <div className="flex items-center justify-between p-6 bg-slate-900 rounded-[2rem] text-white">
                <div className="flex items-center gap-4">
                   <div className={clsx(
                     "w-12 h-12 rounded-2xl flex items-center justify-center",
                     selectedConfirmation.status === 'conforme' ? "bg-green-500/20 text-green-400" :
                     selectedConfirmation.status === 'apto_con_restricciones' ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"
                   )}>
                      {selectedConfirmation.status === 'conforme' ? <CheckCircle2 className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dictamen R-LAB-5</p>
                      <p className="text-xl font-black uppercase tracking-tight">{selectedConfirmation.status.replace(/_/g, ' ')}</p>
                   </div>
                </div>

                <div className="flex items-center gap-3">
                   <div className="text-right mr-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Responsable Técnico</p>
                      <p className="text-sm font-black">{profile?.full_name || 'Harold David Gil Muñoz'}</p>
                   </div>
                   <Button className="rounded-2xl font-black bg-indigo-500 hover:bg-indigo-400 text-white h-12 px-8 flex gap-3 items-center">
                      <Download className="w-5 h-5" /> Generar R-LAB-5 PDF
                   </Button>
                </div>
             </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
