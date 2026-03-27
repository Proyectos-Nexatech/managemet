import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  MoreVertical,
  Filter,
  Download,
  Save,
  Trash2,
  FileText,
  AlertCircle,
  ShieldCheck,
  Calendar,
  User,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '../components/ui/Modal';
import { correctiveActionService, type CorrectiveAction } from '../services/correctiveActions';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';

const statusMap = {
  'open': { label: 'Abierta', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  'in_progress': { label: 'En Ejecución', color: 'bg-blue-100 text-blue-600 border-blue-200' },
  'implemented': { label: 'Implementada', color: 'bg-amber-100 text-amber-600 border-amber-200' },
  'verified': { label: 'Verificada', color: 'bg-purple-100 text-purple-600 border-purple-200' },
  'closed': { label: 'Cerrada', color: 'bg-green-100 text-green-600 border-green-200' },
};

const sourceMap = {
  'nc': { label: 'No Conformidad', icon: AlertCircle },
  'audit': { label: 'Auditoría', icon: ShieldCheck },
  'observation': { label: 'Observación', icon: FileText },
  'risk': { label: 'Riesgo', icon: AlertCircle },
  'complaint': { label: 'Queja Cliente', icon: FileText },
};

export function AccionesCorrectivas() {
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<CorrectiveAction | null>(null);
  const { profile } = useAuth();
  const isAdmin = profile?.role?.name === 'admin';

  // Form State
  const [form, setForm] = useState<Partial<CorrectiveAction>>({
    title: '',
    description: '',
    source: 'nc',
    proposed_action: '',
    responsible: '',
    due_date: new Date().toISOString().split('T')[0],
    status: 'open'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await correctiveActionService.getAll();
      setActions(data);
    } catch (error) {
      console.error('Error fetching actions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    return {
      total: actions.length,
      open: actions.filter(a => a.status === 'open' || a.status === 'in_progress').length,
      implemented: actions.filter(a => a.status === 'implemented').length,
      closed: actions.filter(a => a.status === 'closed' || a.status === 'verified').length
    };
  }, [actions]);

  const filteredActions = actions.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.code.toLowerCase().includes(search.toLowerCase()) ||
    a.responsible.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedAction) {
        await correctiveActionService.update(selectedAction.id, form);
      } else {
        await correctiveActionService.create(form);
      }
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving CA:', error);
    }
  };

  const handleEdit = (action: CorrectiveAction) => {
    setSelectedAction(action);
    setForm(action);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta acción correctiva?')) return;
    try {
      await correctiveActionService.delete(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting CA:', error);
    }
  };

  const resetForm = () => {
    setSelectedAction(null);
    setForm({
      title: '',
      description: '',
      source: 'nc',
      proposed_action: '',
      responsible: '',
      due_date: new Date().toISOString().split('T')[0],
      status: 'open'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Acciones Correctivas (8.7)</h1>
          <p className="text-slate-500 font-medium">Gestión y seguimiento de la eficacia de las correcciones</p>
        </div>
        <Button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-primary hover:bg-primary/90 text-white gap-2 h-11 px-6 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nueva Acción
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 rounded-[2.5rem] border-none shadow-sm bg-white hover:shadow-md transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total</p>
              <h3 className="text-2xl font-black text-slate-800">{stats.total}</h3>
            </div>
          </div>
        </Card>
        <Card className="p-6 rounded-[2.5rem] border-none shadow-sm bg-white hover:shadow-md transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Abiertas</p>
              <h3 className="text-2xl font-black text-slate-800">{stats.open}</h3>
            </div>
          </div>
        </Card>
        <Card className="p-6 rounded-[2.5rem] border-none shadow-sm bg-white hover:shadow-md transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Implementadas</p>
              <h3 className="text-2xl font-black text-slate-800">{stats.implemented}</h3>
            </div>
          </div>
        </Card>
        <Card className="p-6 rounded-[2.5rem] border-none shadow-sm bg-white hover:shadow-md transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Cerradas</p>
              <h3 className="text-2xl font-black text-slate-800">{stats.closed}</h3>
            </div>
          </div>
        </Card>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
        <div className="p-6 border-b border-slate-50 bg-slate-50/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por código, título o responsable..."
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="rounded-xl px-4 py-2 border-slate-100 flex items-center gap-2 text-slate-600 font-bold hover:bg-slate-50 group transition-all">
                <Filter className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                Filtros
              </Button>
              <Button variant="outline" className="rounded-xl px-4 py-2 border-slate-100 flex items-center gap-2 text-slate-600 font-bold hover:bg-slate-50 group transition-all">
                <Download className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                Exportar
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Código / Origen</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Título y Descripción</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Responsable</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Estado</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Plazo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                      <p className="text-sm font-bold text-slate-400">Cargando acciones...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredActions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-sm font-bold text-slate-400">No se encontraron acciones correctivas.</p>
                  </td>
                </tr>
              ) : filteredActions.map((action) => (
                <tr key={action.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-black text-slate-600 border border-slate-200 uppercase w-fit tracking-wider shadow-sm">
                        {action.code}
                      </span>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        {(() => {
                          const Icon = sourceMap[action.source].icon;
                          return <Icon className="w-3.5 h-3.5" />;
                        })()}
                        <span className="text-[10px] font-bold uppercase tracking-tight">{sourceMap[action.source].label}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5 max-w-xs">
                      <span className="text-sm font-black text-slate-800 leading-tight">{action.title}</span>
                      <span className="text-xs text-slate-500 font-medium truncate">{action.description || 'Sin descripción'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase border border-slate-200 leading-none">
                         {action.responsible[0] || '?'}
                       </div>
                       <span className="text-xs font-bold text-slate-600">{action.responsible}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                      statusMap[action.status].color
                    )}>
                      {statusMap[action.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-bold">{new Date(action.due_date).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEdit(action)}
                        className="h-9 w-9 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-primary transition-all p-0"
                      >
                         <MoreVertical className="w-5 h-5" />
                      </Button>
                      {isAdmin && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(action.id)}
                          className="h-9 w-9 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all p-0"
                        >
                           <Trash2 className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedAction ? 'Editar Acción Correctiva' : 'Nueva Acción Correctiva'}
        maxWidthClass="max-w-3xl"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Título de la Acción</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Corrección de error en software..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Origen</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value as any })}
                >
                  {Object.entries(sourceMap).map(([key, value]) => (
                    <option key={key} value={key}>{value.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Descripción / Contexto</label>
                <textarea 
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all resize-none"
                  placeholder="Detalles sobre el hallazgo..."
                  value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Acción Propuesta</label>
                <textarea 
                  required
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all resize-none shadow-sm shadow-primary/5 border-primary/10"
                  placeholder="Pasos específicos a seguir..."
                  value={form.proposed_action}
                  onChange={(e) => setForm({ ...form, proposed_action: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <User className="w-3 h-3" /> Responsable
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="Nombre de la persona o cargo..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                  value={form.responsible}
                  onChange={(e) => setForm({ ...form, responsible: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <Calendar className="w-3 h-3" /> Fecha Límite
                </label>
                <input 
                  type="date" 
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Estado Actual</label>
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

              <div className="p-4 rounded-3xl bg-primary/5 border border-primary/10 space-y-3">
                 <p className="text-[10px] font-bold text-primary uppercase tracking-widest text-center">Resumen de Seguimiento</p>
                 <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">Implementación:</span>
                    <span className="text-slate-700 font-black">{form.implementation_date || 'Pendiente'}</span>
                 </div>
                 <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">Verificación:</span>
                    <span className="text-slate-700 font-black">{form.verification_date || 'Pendiente'}</span>
                 </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-2xl font-bold text-slate-400">
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary text-white rounded-2xl px-8 font-black shadow-lg shadow-primary/20">
              <Save className="w-5 h-5 mr-2" />
              {selectedAction ? 'Guardar Cambios' : 'Crear Acción'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
