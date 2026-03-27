import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  BookOpen,
  FileCheck,
  History,
  MoreVertical,
  Save,
  Trash2,
  ExternalLink,
  Target,
  FlaskConical,
  Scale,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '../components/ui/Modal';
import { methodService, type Method } from '../services/methods';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';

const statusMap = {
  'draft': { label: 'Borrador', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  'validated': { label: 'Validado', color: 'bg-blue-100 text-blue-600 border-blue-200' },
  'active': { label: 'Activo', color: 'bg-green-100 text-green-600 border-green-200' },
  'deprecated': { label: 'Obsoleto', color: 'bg-red-100 text-red-600 border-red-200' },
};

const typeMap = {
  'calibration': { label: 'Calibración', icon: Scale },
  'test': { label: 'Ensayo', icon: FlaskConical },
  'sampling': { label: 'Muestreo', icon: Target },
};

export function Metodos() {
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null);
  const { profile } = useAuth();
  const isAdmin = profile?.role?.name === 'admin';

  // Form State
  const [form, setForm] = useState<Partial<Method>>({
    code: '',
    name: '',
    type: 'calibration',
    version: '1.0',
    status: 'draft',
    standard_ref: '',
    scope: '',
    uncertainty_method: '',
    measurement_range: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await methodService.getAll();
      setMethods(data);
    } catch (error) {
      console.error('Error fetching methods:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredMethods = methods.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedMethod) {
        await methodService.update(selectedMethod.id, form);
      } else {
        await methodService.create(form);
      }
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving method:', error);
    }
  };

  const handleEdit = (method: Method) => {
    setSelectedMethod(method);
    setForm(method);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este método?')) return;
    try {
      await methodService.delete(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting method:', error);
    }
  };

  const resetForm = () => {
    setSelectedMethod(null);
    setForm({
      code: '',
      name: '',
      type: 'calibration',
      version: '1.0',
      status: 'draft',
      standard_ref: '',
      scope: '',
      uncertainty_method: '',
      measurement_range: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Métodos y Procedimientos (7.2)</h1>
          <p className="text-slate-500 font-medium">Gestión de técnicas de ensayo y calibración</p>
        </div>
        <Button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-primary hover:bg-primary/90 text-white gap-2 h-11 px-6 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nuevo Método
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-6 rounded-[2.5rem] border-none shadow-sm bg-white hover:shadow-md transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Métodos</p>
              <h3 className="text-2xl font-black text-slate-800">{methods.length}</h3>
            </div>
          </div>
        </Card>
        <Card className="p-6 rounded-[2.5rem] border-none shadow-sm bg-white hover:shadow-md transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Validados</p>
              <h3 className="text-2xl font-black text-slate-800">{methods.filter(m => m.status === 'active' || m.status === 'validated').length}</h3>
            </div>
          </div>
        </Card>
        <Card className="p-6 rounded-[2.5rem] border-none shadow-sm bg-white hover:shadow-md transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
              <History className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Próxima Revisión</p>
              <h3 className="text-2xl font-black text-slate-800">4 <span className="text-xs text-slate-400 font-bold uppercase">Mes actual</span></h3>
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
                placeholder="Buscar por código o nombre..."
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Código / Tipo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Nombre del Método</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-center">Versión</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Estado</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Referencia</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                   <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                         <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                         <p className="text-sm font-bold text-slate-400">Cargando métodos...</p>
                      </div>
                   </td>
                </tr>
              ) : filteredMethods.length === 0 ? (
                <tr>
                   <td colSpan={6} className="px-6 py-12 text-center">
                      <p className="text-sm font-bold text-slate-400">No se encontraron métodos.</p>
                   </td>
                </tr>
              ) : filteredMethods.map((method) => (
                <tr key={method.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-black text-slate-600 border border-slate-200 uppercase w-fit tracking-wider shadow-sm">
                        {method.code}
                      </span>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        {(() => {
                           const Icon = typeMap[method.type].icon;
                           return <Icon className="w-3.5 h-3.5" />;
                        })()}
                        <span className="text-[10px] font-bold uppercase tracking-tight">{typeMap[method.type].label}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5 max-w-md">
                      <span className="text-sm font-black text-slate-800 leading-tight">{method.name}</span>
                      <span className="text-xs text-slate-500 font-medium truncate">{method.scope || 'Sin alcance definido'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                     <span className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 text-xs font-black text-slate-500">v{method.version}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                      statusMap[method.status].color
                    )}>
                      {statusMap[method.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold truncate max-w-[150px]">
                       {method.standard_ref || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEdit(method)}
                        className="h-9 w-9 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-primary transition-all p-0"
                      >
                         <MoreVertical className="w-5 h-5" />
                      </Button>
                      {isAdmin && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(method.id)}
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
        title={selectedMethod ? 'Editar Método/Procedimiento' : 'Nuevo Método/Procedimiento'}
        maxWidthClass="max-w-4xl"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2 col-span-1">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Código</label>
                       <input 
                          type="text" required placeholder="MET-01"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                          value={form.code}
                          onChange={(e) => setForm({ ...form, code: e.target.value })}
                       />
                    </div>
                    <div className="space-y-2 col-span-2">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nombre Completo</label>
                       <input 
                          type="text" required placeholder="Calibración de balanzas..."
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Tipo</label>
                       <select 
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                          value={form.type}
                          onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                       >
                          {Object.entries(typeMap).map(([key, value]) => (
                             <option key={key} value={key}>{value.label}</option>
                          ))}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Versión / Estado</label>
                       <div className="flex gap-2">
                          <input 
                             type="text" placeholder="1.0"
                             className="w-20 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all text-center"
                             value={form.version}
                             onChange={(e) => setForm({ ...form, version: e.target.value })}
                          />
                          <select 
                             className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
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

                 <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Referencia Normativa / Estándar</label>
                    <input 
                       type="text" placeholder="EURAMET cg-18..."
                       className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                       value={form.standard_ref || ''}
                       onChange={(e) => setForm({ ...form, standard_ref: e.target.value })}
                    />
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Alcance / Campo de Aplicación</label>
                    <textarea 
                       rows={2}
                       className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all resize-none"
                       placeholder="Rango de 0 a 100 kg..."
                       value={form.scope || ''}
                       onChange={(e) => setForm({ ...form, scope: e.target.value })}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Método de Incertidumbre</label>
                    <textarea 
                       rows={2}
                       className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all resize-none"
                       placeholder="GUM (Guide to the expression of uncertainty in measurement)..."
                       value={form.uncertainty_method || ''}
                       onChange={(e) => setForm({ ...form, uncertainty_method: e.target.value })}
                    />
                 </div>

                 <div className="p-4 rounded-3xl bg-primary/5 border border-primary/10 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Validación ISO 17025 (7.2.1)</span>
                       <Button variant="ghost" size="sm" className="h-7 px-2 rounded-lg text-[10px] font-black hover:bg-primary/10">Historial</Button>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-white border border-primary/10 flex items-center justify-center text-primary">
                          <ExternalLink className="w-4 h-4" />
                       </div>
                       <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-700">Evidencia de Validación</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Cargar informe de validación</span>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
             <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-2xl font-bold text-slate-400">
               Cancelar
             </Button>
             <Button type="submit" className="bg-primary text-white rounded-2xl px-8 font-black shadow-lg shadow-primary/20">
               <Save className="w-5 h-5 mr-3" />
               {selectedMethod ? 'Guardar Cambios' : 'Crear Método'}
             </Button>
           </div>
        </form>
      </Modal>
    </div>
  );
}
