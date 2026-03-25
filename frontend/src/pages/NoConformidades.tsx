import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MoreVertical,
  Filter,
  Download,
  ShieldAlert,
  HelpCircle,
  Save,
  Trash2,
  ArrowRight
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '../components/ui/Modal';
import { ncService, type NonConformity, type RootCauseFactor } from '../services/nonConformities';
import clsx from 'clsx';

const severityMap = {
  'critica': { label: 'Crítica', color: 'bg-red-100 text-red-600 border-red-200' },
  'mayor': { label: 'Mayor', color: 'bg-orange-100 text-orange-600 border-orange-200' },
  'menor': { label: 'Menor', color: 'bg-blue-100 text-blue-600 border-blue-200' },
};

const statusMap = {
  'open': { label: 'Abierta', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  'analysis': { label: 'En Análisis', color: 'bg-blue-100 text-blue-600 border-blue-200' },
  'in_progress': { label: 'En Ejecución', color: 'bg-amber-100 text-amber-600 border-amber-200' },
  'closed': { label: 'Cerrada', color: 'bg-green-100 text-green-600 border-green-200' },
  'cancelled': { label: 'Cancelada', color: 'bg-red-50 text-red-400 border-red-100' },
};

export function NoConformidades() {
  const [ncs, setNcs] = useState<NonConformity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNC, setSelectedNC] = useState<NonConformity | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'rca' | 'actions' | 'closure'>('summary');
  const [rcFactors, setRcFactors] = useState<RootCauseFactor[]>([]);

  // Form State for new NC
  const [newNC, setNewNC] = useState<Partial<NonConformity>>({
    title: '',
    description: '',
    source: 'internal_audit',
    severity: 'mayor',
    status: 'open',
    detection_date: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await ncService.getAll();
      setNcs(data);
    } catch (error) {
      console.error('Error fetching NCs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchDetailData = async (id: string) => {
    try {
      const factors = await ncService.getRootCauseFactors(id);
      setRcFactors(factors);
    } catch (error) {
       console.error('Error fetching detail data:', error);
    }
  };

  const stats = useMemo(() => {
    return {
      open: ncs.filter(n => n.status === 'open' || n.status === 'analysis').length,
      inProgress: ncs.filter(n => n.status === 'in_progress').length,
      overdue: 0, // Logic for overdue actions
      closed: ncs.filter(n => n.status === 'closed').length
    };
  }, [ncs]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ncService.create(newNC);
      setIsModalOpen(false);
      setNewNC({ title: '', description: '', source: 'internal_audit', severity: 'mayor', status: 'open', detection_date: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (error) {
      console.error('Error creating NC:', error);
    }
  };

  const handleOpenDetail = (nc: NonConformity) => {
    setSelectedNC(nc);
    fetchDetailData(nc.id);
    setIsDetailOpen(true);
    setActiveTab('summary');
  };

  const handleAddWhy = async (whyNumber: number, factor: string) => {
    if (!selectedNC) return;
    try {
      await ncService.addRootCauseFactor({
        nc_id: selectedNC.id,
        method: '5-why',
        why_level: whyNumber,
        factor
      });
      fetchDetailData(selectedNC.id);
    } catch (error) {
      console.error('Error adding factor:', error);
    }
  };

  const filteredNcs = ncs.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    n.nc_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-800 uppercase">No Conformidades (NCR)</h1>
          <p className="text-xs font-bold text-slate-400">Control de hallazgos, causa raíz y mejora continua (ISO 17025).</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 shadow-sm" />
            <input 
              type="text" 
              placeholder="Código o título..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-[1.25rem] py-3.5 pl-11 pr-4 text-[11px] font-black outline-none focus:ring-4 focus:ring-primary/5 transition-all shadow-sm"
            />
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="rounded-[1.25rem] h-13 px-8 font-black flex items-center gap-3 shadow-xl shadow-red-200 bg-red-500 border-none transition-all hover:scale-[1.03] active:scale-95 text-white"
          >
            <Plus className="w-5 h-5 stroke-[3px]" />
            REGISTRAR HALLAZGO
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <Card className="rounded-[2.5rem] border-none bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-3">
               <div className="p-3.5 bg-red-50 rounded-2xl">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
               </div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Abiertas</span>
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-3xl font-black text-slate-800 tracking-tighter">{stats.open}</span>
               <span className="text-[10px] font-black text-red-500 tracking-wide leading-none">Pendientes</span>
            </div>
         </Card>
         <Card className="rounded-[2.5rem] border-none bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-3">
               <div className="p-3.5 bg-amber-50 rounded-2xl">
                  <Clock className="w-5 h-5 text-amber-500" />
               </div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">En Ejecución</span>
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-3xl font-black text-slate-800 tracking-tighter">{stats.inProgress}</span>
               <span className="text-[10px] font-black text-amber-500 tracking-wide leading-none">Con acciones</span>
            </div>
         </Card>
         <Card className="rounded-[2.5rem] border-none bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-3">
               <div className="p-3.5 bg-slate-100 rounded-2xl">
                  <HelpCircle className="w-5 h-5 text-slate-500" />
               </div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Vencidas</span>
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-3xl font-black text-slate-800 tracking-tighter">{stats.overdue}</span>
               <span className="text-[10px] font-black text-slate-400 tracking-wide leading-none">Urgentes</span>
            </div>
         </Card>
         <Card className="rounded-[2.5rem] border-none bg-slate-900 p-6 shadow-xl shadow-slate-200">
            <div className="flex items-center gap-4 mb-3">
               <div className="p-3.5 bg-white/10 rounded-2xl">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
               </div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Cerradas</span>
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-3xl font-black text-white tracking-tighter">{stats.closed}</span>
               <span className="text-[10px] font-black text-green-400 tracking-wide leading-none">Eficaces</span>
            </div>
         </Card>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-[0_12px_45px_-12px_rgba(0,0,0,0.05)] bg-white overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
           <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-slate-800" />
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Log de Hallazgos y No Conformidades</h2>
           </div>
           <button className="p-2 text-slate-400 hover:text-slate-800 transition-colors">
              <Filter className="w-5 h-5" />
           </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/30">
                <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Código</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Hallazgo</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Severidad</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Fuente</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Fecha Límite</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="py-8 px-8"><div className="h-4 bg-slate-100 rounded-full w-full"></div></td>
                  </tr>
                ))
              ) : filteredNcs.length === 0 ? (
                <tr>
                   <td colSpan={6} className="py-12 text-center text-slate-300">
                      No hay hallazgos registrados.
                   </td>
                </tr>
              ) : filteredNcs.map((nc) => (
                <tr key={nc.id} onClick={() => handleOpenDetail(nc)} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                  <td className="py-6 px-8">
                     <span className="text-[11px] font-black text-slate-800 border-b-2 border-red-500/20">
                        {nc.nc_code}
                     </span>
                  </td>
                  <td className="py-6 px-8">
                     <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-800 leading-tight group-hover:text-red-500 transition-colors">{nc.title}</span>
                        <span className={clsx("text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 mt-1", statusMap[nc.status as keyof typeof statusMap]?.color || 'text-slate-400')}>
                           {statusMap[nc.status as keyof typeof statusMap]?.label || nc.status}
                        </span>
                     </div>
                  </td>
                  <td className="py-6 px-8">
                     <span className={clsx("text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-transparent", severityMap[nc.severity as keyof typeof severityMap]?.color)}>
                        {severityMap[nc.severity as keyof typeof severityMap]?.label || nc.severity}
                     </span>
                  </td>
                  <td className="py-6 px-8">
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {nc.source.replace('_', ' ')}
                     </span>
                  </td>
                  <td className="py-6 px-8">
                     <span className="text-[11px] font-bold text-slate-400">
                        {nc.target_close_date ? new Date(nc.target_close_date).toLocaleDateString() : 'Por definir'}
                     </span>
                  </td>
                  <td className="py-6 px-8 text-right">
                     <button className="p-2 text-slate-300 hover:text-slate-800 transition-colors">
                        <MoreVertical className="w-5 h-5" />
                     </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail & Analysis Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`Gestión NCR: ${selectedNC?.nc_code || ''}`}>
        {selectedNC && (
          <div className="space-y-6">
             <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
              {(['summary', 'rca', 'actions', 'closure'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    "flex-1 py-2.5 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                    activeTab === tab ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {tab === 'summary' ? 'Resumen' : tab === 'rca' ? 'Causa Raíz' : tab === 'actions' ? 'Acciones' : 'Cierre'}
                </button>
              ))}
            </div>

            {activeTab === 'summary' && (
               <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Descripción del Hallazgo</p>
                        <p className="text-sm font-bold text-slate-800 leading-relaxed">{selectedNC.description}</p>
                     </div>
                     <div className="grid grid-cols-2 gap-6 pt-2">
                        <div>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fuente</p>
                           <p className="text-xs font-bold text-slate-700 capitalize">{selectedNC.source.replace('_', ' ')}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Detección</p>
                           <p className="text-xs font-bold text-slate-700">{new Date(selectedNC.detection_date).toLocaleDateString()}</p>
                        </div>
                     </div>
                  </div>
                  <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100/50">
                     <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Acción Inmediata (Contención)</p>
                     <p className="text-sm font-bold text-blue-700 italic">"{selectedNC.immediate_action || 'Sin acción inmediata registrada'}"</p>
                  </div>
               </div>
            )}

            {activeTab === 'rca' && (
               <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between mb-4">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Método: 5 Por Qués (5-Whys)</p>
                     <Button variant="outline" className="h-8 rounded-xl text-[9px] font-black border-slate-200">CAMBIAR A ISHIKAWA</Button>
                  </div>
                  
                  <div className="space-y-4 relative before:absolute before:left-6 before:top-8 before:bottom-8 before:w-0.5 before:bg-slate-100">
                     {[1, 2, 3, 4, 5].map(i => {
                        const factor = rcFactors.find(f => f.why_level === i);
                        return (
                           <div key={i} className="relative pl-12">
                              <div className={clsx("absolute left-1 top-0 w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ring-4 ring-white", factor ? "bg-primary text-white" : "bg-slate-100 text-slate-300")}>
                                 {i}
                              </div>
                              {factor ? (
                                 <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm group">
                                    <p className="text-[11px] font-bold text-slate-800">{factor.factor}</p>
                                    <button onClick={() => ncService.removeRootCauseFactor(factor.id).then(() => fetchDetailData(selectedNC.id))} className="absolute hidden group-hover:block -right-2 -top-2 p-1.5 bg-red-500 text-white rounded-lg shadow-lg">
                                       <Trash2 className="w-3 h-3" />
                                    </button>
                                 </div>
                              ) : (
                                 <div className="flex gap-2">
                                    <input 
                                       placeholder={`¿Por qué ocurrió el paso ${i}?`} 
                                       className="flex-1 bg-slate-50 border-none rounded-2xl px-4 text-xs font-bold outline-none h-10"
                                       onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                             handleAddWhy(i, (e.target as HTMLInputElement).value);
                                             (e.target as HTMLInputElement).value = '';
                                          }
                                       }}
                                    />
                                    <Button className="h-10 w-10 p-0 rounded-2xl bg-slate-200 text-slate-400 group-hover:bg-primary group-hover:text-white">
                                       <ArrowRight className="w-4 h-4" />
                                    </Button>
                                 </div>
                              )}
                           </div>
                        );
                     })}
                  </div>
                  
                  <div className="p-4 bg-primary/5 rounded-[2rem] border border-primary/10">
                     <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Resumen Causa Raíz</p>
                     <p className="text-sm font-bold text-slate-800">{rcFactors.find(f => f.why_level === 5)?.factor || 'Análisis incompleto'}</p>
                  </div>
               </div>
            )}

            {activeTab === 'actions' && (
               <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Acciones Correctivas (CAPA)</p>
                     <Button className="h-9 px-4 rounded-xl text-[10px] font-black bg-primary text-white gap-2">
                        <Plus className="w-4 h-4" /> AGREGAR ACCIÓN
                     </Button>
                  </div>
                  
                  <div className="space-y-3">
                     {selectedNC.nc_corrective_actions?.length === 0 && <p className="text-center py-8 text-[10px] font-bold text-slate-400">No hay acciones registradas.</p>}
                     {selectedNC.nc_corrective_actions?.map(action => (
                        <div key={action.id} className="bg-white border border-slate-100 p-5 rounded-[2rem] hover:shadow-md transition-all">
                           <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                 <p className="text-sm font-bold text-slate-800">{action.action_description}</p>
                                 <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsable: {action.responsible}</span>
                                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Límite: {new Date(action.due_date).toLocaleDateString()}</span>
                                 </div>
                              </div>
                              <span className={clsx("text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border", action.status === 'done' ? 'bg-green-50 text-green-500 border-green-100' : 'bg-slate-50 text-slate-400')}>
                                 {action.status}
                              </span>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {activeTab === 'closure' && (
               <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-2 gap-6">
                     <div className="bg-slate-50 p-6 rounded-[2rem] text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Acciones Cerradas</p>
                        <p className="text-2xl font-black text-slate-800">
                           {selectedNC.nc_corrective_actions?.filter(a => a.status === 'done').length} / {selectedNC.nc_corrective_actions?.length}
                        </p>
                     </div>
                     <div className="bg-slate-50 p-6 rounded-[2rem] text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Eficacia</p>
                        <p className="text-2xl font-black text-green-500">
                           {selectedNC.nc_corrective_actions?.length ? Math.round((selectedNC.nc_corrective_actions.filter(a => a.status === 'done').length / selectedNC.nc_corrective_actions.length) * 100) : 0}%
                        </p>
                     </div>
                  </div>
                  
                  <div className="space-y-4 p-6 bg-red-50/30 rounded-[2.5rem] border border-red-50">
                     <p className="text-xs font-black text-slate-800 uppercase tracking-widest text-center">Cierre Definitivo</p>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Evidencia Final de Cierre</label>
                        <div className="border-2 border-dashed border-red-100 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-2 bg-white/50">
                           <Download className="w-6 h-6 text-red-200" />
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subir Reporte de Eficacia</span>
                        </div>
                     </div>
                     <Button 
                        disabled={selectedNC.status === 'closed' || selectedNC.nc_corrective_actions?.some(a => a.status !== 'done')} 
                        className="w-full h-14 rounded-[2rem] bg-slate-900 text-white font-black text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                     >
                        {selectedNC.status === 'closed' ? 'NCR CERRADA EXITOSAMENTE' : 'VERIFICAR Y CERRAR NCR'}
                     </Button>
                  </div>
               </div>
            )}
          </div>
        )}
      </Modal>

      {/* New NC Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registro de Hallazgo / No Conformidad">
         <form onSubmit={handleCreate} className="space-y-6">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Título del Hallazgo</label>
               <input required placeholder="ej: Desviación en calibración de manómetro EPT-P8" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-red-500/20 outline-none" value={newNC.title} onChange={(e) => setNewNC({...newNC, title: e.target.value})} />
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Descripción Detallada (Evidencia Objetiva)</label>
               <textarea rows={3} required placeholder="Describa el incumplimiento detectado..." className="w-full bg-slate-50 border-none rounded-3xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-red-500/20 outline-none resize-none" value={newNC.description} onChange={(e) => setNewNC({...newNC, description: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Fuente</label>
                  <select 
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-red-500/20 outline-none"
                    value={newNC.source}
                    onChange={(e) => setNewNC({...newNC, source: e.target.value as NonConformity['source']})}
                  >
                    <option value="internal_audit">Auditoría Interna</option>
                    <option value="external_audit">Auditoría Externa</option>
                    <option value="client_complaint">Queja Cliente</option>
                    <option value="calibration">Proceso Calibración</option>
                    <option value="observation">Observación / Hallazgo</option>
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Severidad</label>
                  <select 
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-red-500/20 outline-none"
                    value={newNC.severity}
                    onChange={(e) => setNewNC({...newNC, severity: e.target.value as NonConformity['severity']})}
                  >
                    <option value="menor">Menor (Obs)</option>
                    <option value="mayor">Mayor (NC)</option>
                    <option value="critica">Crítica (Block)</option>
                  </select>
               </div>
            </div>

            <div className="flex gap-4 pt-4">
               <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-13 rounded-2xl font-black border-slate-200 uppercase">cancelar</Button>
               <Button type="submit" className="flex-1 h-13 rounded-2xl font-black bg-red-500 text-white shadow-xl shadow-red-200 uppercase gap-3">
                 <Save className="w-5 h-5" /> guardar hallazgo
               </Button>
            </div>
         </form>
      </Modal>
    </div>
  );
}
