import { useState, useEffect } from 'react';
import { 
  Plus,
  Target,
  Users,
  Calendar,
  Download,
  Save,
  ChevronRight,
  ClipboardList,
  MessageSquare,
  Layout,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '../components/ui/Modal';
import { managementReviewService, type ManagementReview } from '../services/managementReviews';
import clsx from 'clsx';

const statusMap = {
  'planned': { label: 'Planificada', color: 'bg-blue-100 text-blue-600 border-blue-200' },
  'in_progress': { label: 'En Curso', color: 'bg-amber-100 text-amber-600 border-amber-200' },
  'completed': { label: 'Completada', color: 'bg-green-100 text-green-600 border-green-200' },
};

const ISO_INPUTS = [
  { clause: '8.9.2 a)', topic: 'Cambios en cuestiones internas/externas' },
  { clause: '8.9.2 b)', topic: 'Cumplimiento de objetivos' },
  { clause: '8.9.2 c)', topic: 'Adecuación de políticas y procedimientos' },
  { clause: '8.9.2 d)', topic: 'Estado de acciones de revisiones anteriores' },
  { clause: '8.9.2 e)', topic: 'Resultado de auditorías internas recientes' },
  { clause: '8.9.2 f)', topic: 'Acciones correctivas y no conformidades' },
  { clause: '8.9.2 g)', topic: 'Evaluaciones por organismos externos' },
  { clause: '8.9.2 h)', topic: 'Cambios en volumen/tipo de trabajo' },
  { clause: '8.9.2 i)', topic: 'Retroalimentación de clientes' },
  { clause: '8.9.2 j)', topic: 'Quejas' },
  { clause: '8.9.2 k)', topic: 'Eficacia de mejoras implementadas' },
  { clause: '8.9.2 l)', topic: 'Adecuación de recursos' },
  { clause: '8.9.2 m)', topic: 'Resultados de identificación de riesgos' },
  { clause: '8.9.2 n)', topic: 'Resultados del aseguramiento de validez' },
  { clause: '8.9.2 o)', topic: 'Otros factores (formación, etc)' },
];

export function RevisionDireccion() {
  const [reviews, setReviews] = useState<ManagementReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ManagementReview | null>(null);
  // Form State
  const [form, setForm] = useState<Partial<ManagementReview>>({
    title: '',
    review_date: new Date().toISOString().split('T')[0],
    status: 'planned',
    participants: [],
    period_from: '',
    period_to: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await managementReviewService.getAll();
      setReviews(data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedReview) {
        await managementReviewService.update(selectedReview.id, form);
      } else {
        await managementReviewService.create(form);
      }
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving review:', error);
    }
  };

  const handleEdit = (review: ManagementReview) => {
    setSelectedReview(review);
    setForm(review);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setSelectedReview(null);
    setForm({
      title: '',
      review_date: new Date().toISOString().split('T')[0],
      status: 'planned',
      participants: [],
      period_from: '',
      period_to: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Revisión por la Dirección (8.9)</h1>
          <p className="text-slate-500 font-medium">Evaluación periódica del sistema de gestión por la alta dirección</p>
        </div>
        <Button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-primary hover:bg-primary/90 text-white gap-2 h-11 px-6 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nueva Revisión
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4 space-y-4">
           <Card className="p-6 rounded-[2.5rem] border-none shadow-sm bg-white hover:shadow-md transition-all">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <ClipboardList className="w-4 h-4 text-primary" /> Historial de Revisiones
              </h3>
              <div className="space-y-3">
                 {loading ? (
                    <div className="h-20 flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                 ) : reviews.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold text-center py-4">No hay revisiones registradas.</p>
                 ) : reviews.map(review => (
                    <button 
                       key={review.id}
                       onClick={() => handleEdit(review)}
                       className={clsx(
                          "w-full p-4 rounded-2xl border transition-all text-left group",
                          selectedReview?.id === review.id ? "bg-primary/5 border-primary/20 ring-4 ring-primary/5" : "bg-white border-slate-50 hover:border-slate-200"
                       )}
                    >
                       <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{review.code}</span>
                          <span className={clsx("px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter", statusMap[review.status].color)}>
                             {statusMap[review.status].label}
                          </span>
                       </div>
                       <p className="text-xs font-black text-slate-700 leading-tight mb-2 group-hover:text-primary transition-colors">{review.title}</p>
                       <div className="flex items-center gap-2 text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold">{new Date(review.review_date).toLocaleDateString()}</span>
                       </div>
                    </button>
                 ))}
              </div>
           </Card>

           <Card className="p-6 rounded-[2.5rem] border-none shadow-sm bg-slate-900 text-white overflow-hidden relative">
              <div className="relative z-10">
                 <h3 className="text-xs font-black uppercase tracking-widest mb-2 opacity-60">Requerimientos ISO</h3>
                 <p className="text-sm font-bold leading-relaxed mb-4">La norma exige una revisión al menos una vez al año evaluando 15 puntos específicos de entrada.</p>
                 <Button variant="ghost" className="text-xs font-black bg-white/10 hover:bg-white/20 text-white border-none rounded-xl h-9 px-4">
                    Ver Guía Cláusula 8.9
                 </Button>
              </div>
              <Layout className="absolute right-0 bottom-0 w-32 h-32 text-white/5 -rotate-12 translate-x-6 translate-y-6" />
           </Card>
        </div>

        <div className="md:col-span-8">
           {selectedReview ? (
              <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden min-h-[500px]">
                 <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <div>
                       <div className="flex items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-black text-slate-600 border border-slate-200 uppercase tracking-widest">{selectedReview.code}</span>
                          <span className={clsx("px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest", statusMap[selectedReview.status].color)}>
                             {statusMap[selectedReview.status].label}
                          </span>
                       </div>
                       <h2 className="text-xl font-black text-slate-800 tracking-tight">{selectedReview.title}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                       <Button variant="outline" className="rounded-xl font-bold border-slate-100 h-10 px-4 text-slate-600 hover:bg-slate-50"><Download className="w-4 h-4 mr-2" /> PDF</Button>
                       <Button className="bg-primary hover:bg-primary/90 text-white rounded-xl font-black h-10 px-6 shadow-lg shadow-primary/20"><Save className="w-4 h-4 mr-2" /> Guardar Todo</Button>
                    </div>
                 </div>
                 
                 <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                       <div className="space-y-4">
                          <div className="flex flex-col">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Participantes</span>
                             <div className="flex flex-wrap gap-2">
                                {(selectedReview.participants || []).map((p, i) => (
                                   <span key={i} className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-600">{p}</span>
                                ))}
                                <Button variant="ghost" size="sm" className="h-7 px-2 border border-dashed border-slate-200 rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-50 hover:text-primary transition-all">+ Añadir</Button>
                             </div>
                          </div>
                       </div>
                       <div className="space-y-4">
                          <div className="flex flex-col">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2"><Target className="w-3.5 h-3.5" /> Período Evaluado</span>
                             <div className="flex items-center gap-3 text-xs font-black text-slate-700 bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100 w-fit">
                                <span>{selectedReview.period_from || 'N/A'}</span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                                <span>{selectedReview.period_to || 'N/A'}</span>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-4 mt-8">
                       <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-primary" /> Entradas de la Revisión (Numeral 8.9.2)
                       </h3>
                       <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                          {ISO_INPUTS.map((item, i) => (
                             <div key={i} className="p-5 rounded-3xl border border-slate-50 bg-slate-50/30 hover:bg-white hover:border-slate-100 hover:shadow-sm transition-all group">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                   <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                         <span className="text-[9px] font-black text-primary/60 uppercase tracking-tighter">{item.clause}</span>
                                         <h4 className="text-xs font-black text-slate-700 group-hover:text-primary transition-colors">{item.topic}</h4>
                                      </div>
                                      <textarea 
                                         className="w-full mt-2 p-3 bg-white border border-slate-100 rounded-xl text-xs font-medium focus:ring-4 focus:ring-primary/5 transition-all min-h-[60px]"
                                         placeholder="Resumen de hallazgos para este punto..."
                                      />
                                   </div>
                                   <div className="w-full md:w-56 shrink-0 flex flex-col gap-2">
                                      <label className="text-[9px] font-black text-slate-400 uppercase">Decisión / Acción</label>
                                      <select className="px-3 py-2 bg-white border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600 focus:outline-none transition-all">
                                         <option>Sin cambios requeridos</option>
                                         <option>Requiere Mejora</option>
                                         <option>Generar Acción Correctiva</option>
                                         <option>Actualizar Procedimiento</option>
                                      </select>
                                   </div>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </Card>
           ) : (
              <div className="h-full min-h-[500px] rounded-[2.5rem] border-2 border-dashed border-slate-100 bg-slate-50/40 flex flex-col items-center justify-center text-center p-8">
                 <div className="w-20 h-20 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-200 mb-6 shadow-sm">
                    <ClipboardList className="w-10 h-10" />
                 </div>
                 <h2 className="text-xl font-black text-slate-400 tracking-tight">Seleccione una revisión</h2>
                 <p className="text-sm font-bold text-slate-300 mt-2 max-w-xs leading-relaxed">Elija una revisión del historial para ver los detalles y las actas generadas.</p>
              </div>
           )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedReview ? 'Datos Generales de la Revisión' : 'Nueva Revisión por la Dirección'}
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
           <div className="space-y-4">
              <div className="space-y-2">
                 <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Título / Identificador</label>
                 <input 
                    type="text" required placeholder="Revisión Anual del SG ISO 17025..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                 />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Fecha Programada</label>
                    <input 
                       type="date" required
                       className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                       value={form.review_date}
                       onChange={(e) => setForm({ ...form, review_date: e.target.value })}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Estado Inicial</label>
                    <select 
                       className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                       value={form.status}
                       onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    >
                       {Object.entries(statusMap).map(([key, value]) => (
                          <option key={key} value={key}>{value.label}</option>
                       ))}
                    </select>
                 </div>
              </div>
           </div>

           <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
             <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-2xl font-bold text-slate-400">
               Cancelar
             </Button>
             <Button type="submit" className="bg-primary text-white rounded-2xl px-8 font-black shadow-lg shadow-primary/20">
               <Save className="w-5 h-5 mr-3" />
               {selectedReview ? 'Actualizar Datos' : 'Crear Revisión'}
             </Button>
           </div>
        </form>
      </Modal>
    </div>
  );
}
