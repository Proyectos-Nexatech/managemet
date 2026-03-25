import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Layers, 
  Thermometer, 
  Gauge, 
  Weight, 
  Scaling, 
  Droplets,
  Edit2,
  Trash2,
  ChevronRight,
  AlertCircle,
  Loader2,
  Settings2,
  History,
  FileText,
  Target,
  Ruler,
  Activity
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { magnitudesService, type Magnitude } from '../services/magnitudes';
import { Modal } from '../components/ui/Modal';
import clsx from 'clsx';

const iconMap: Record<string, any> = {
  'Temperatura': Thermometer,
  'Presión': Gauge,
  'Masa': Weight,
  'Longitud': Scaling,
  'Volumen': Droplets,
  'Humedad': Droplets,
};

const colorMap: Record<string, string> = {
  'Temperatura': 'text-orange-500 bg-orange-50',
  'Presión': 'text-blue-500 bg-blue-50',
  'Masa': 'text-slate-700 bg-slate-100',
  'Longitud': 'text-teal-500 bg-teal-50',
  'Volumen': 'text-cyan-500 bg-cyan-50',
  'Humedad': 'text-blue-600 bg-blue-50',
};

export function Magnitudes() {
  const [magnitudes, setMagnitudes] = useState<Magnitude[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  // CRUD Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMagnitude, setEditingMagnitude] = useState<Magnitude | null>(null);
  const [newMagnitude, setNewMagnitude] = useState({ name: '', description: '' });

  // Config Modal State
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configMagnitude, setConfigMagnitude] = useState<Magnitude | null>(null);

  // Delete Confirmation State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [magnitudeToDelete, setMagnitudeToDelete] = useState<Magnitude | null>(null);

  const fetchMagnitudes = async () => {
    try {
      setLoading(true);
      const data = await magnitudesService.getAll();
      setMagnitudes(data);
    } catch (error) {
      console.error('Error fetching magnitudes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMagnitudes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingMagnitude) {
        await magnitudesService.update(editingMagnitude.id, newMagnitude);
      } else {
        await magnitudesService.create(newMagnitude);
      }
      setIsModalOpen(false);
      setNewMagnitude({ name: '', description: '' });
      setEditingMagnitude(null);
      fetchMagnitudes();
    } catch (error) {
      console.error('Error saving magnitude:', error);
      alert('Error al guardar la magnitud. Revisa si el nombre ya existe.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!magnitudeToDelete) return;
    setIsSubmitting(true);
    try {
      await magnitudesService.delete(magnitudeToDelete.id);
      setIsDeleteOpen(false);
      setMagnitudeToDelete(null);
      fetchMagnitudes();
    } catch (error) {
      console.error('Error deleting magnitude:', error);
      alert('Error al eliminar la magnitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (magnitude: Magnitude) => {
    setEditingMagnitude(magnitude);
    setNewMagnitude({ name: magnitude.name, description: magnitude.description || '' });
    setIsModalOpen(true);
  };

  const confirmDelete = (magnitude: Magnitude) => {
    setMagnitudeToDelete(magnitude);
    setIsDeleteOpen(true);
  };

  const handleConfig = (magnitude: Magnitude) => {
    setConfigMagnitude(magnitude);
    setIsConfigOpen(true);
  };

  const filteredMagnitudes = magnitudes.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-800">Magnitudes Metrológicas</h1>
          <p className="text-xs font-bold text-slate-400 font-sans">Gestiona las magnitudes físicas y sus configuraciones base (ISO 17025)</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Buscar magnitud..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-11 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400 shadow-[0_4px_12px_rgb(0,0,0,0.01)]"
            />
          </div>
          <Button 
            onClick={() => {
              setEditingMagnitude(null);
              setNewMagnitude({ name: '', description: '' });
              setIsModalOpen(true);
            }}
            className="rounded-2xl h-12 px-8 font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 bg-primary text-white border-0"
          >
            <Plus className="w-5 h-5" />
            Nueva Magnitud
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} className="h-48 bg-slate-100/50 rounded-[2.5rem] animate-pulse border border-slate-50" />
          ))
        ) : filteredMagnitudes.length === 0 ? (
          <div className="col-span-full h-96 flex flex-col items-center justify-center text-center p-10 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 shadow-sm shadow-slate-200/20">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-slate-50/50">
                <Layers className="w-10 h-10 text-slate-300" />
             </div>
             <p className="text-xl font-black text-slate-800 mb-2">No hay magnitudes</p>
             <p className="text-sm font-bold text-slate-400 mb-8 max-w-sm">
               Empieza agregando las magnitudes físicas que tu laboratorio gestiona.
             </p>
             <Button 
               onClick={async () => {
                 const seed = [
                   { name: 'Temperatura', description: 'Magnitud física que expresa el grado de calor.' },
                   { name: 'Presión', description: 'Fuerza que ejerce un gas o líquido.' },
                   { name: 'Masa', description: 'Cantidad de materia de un cuerpo.' },
                 ];
                 for (const m of seed) {
                   await magnitudesService.create(m as Partial<Magnitude>);
                 }
                 fetchMagnitudes();
               }}
               variant="outline" 
               className="rounded-2xl h-11 px-8 font-black border-slate-200 hover:bg-slate-50 transition-all"
             >
               Cargar Magnitudes Base
             </Button>
          </div>
        ) : (
          filteredMagnitudes.map((magnitude: Magnitude) => {
            const Icon = iconMap[magnitude.name] || Layers;
            const colorClass = colorMap[magnitude.name] || 'text-slate-500 bg-slate-50';
            
            return (
              <Card key={magnitude.id} className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2.5rem] overflow-hidden group hover:scale-[1.02] hover:shadow-[0_20px_60px_rgb(0,0,0,0.03)] transition-all duration-300 bg-white p-8 border border-white hover:border-slate-100 flex flex-col h-full">
                <CardContent className="p-0 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <div className={clsx("p-4 rounded-3xl transition-all duration-500 group-hover:rotate-6 shadow-sm", colorClass)}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEdit(magnitude)}
                        className="p-3 text-slate-300 hover:text-primary hover:bg-blue-50/50 rounded-2xl transition-all active:scale-90"
                      >
                         <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => confirmDelete(magnitude)}
                        className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all active:scale-90"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-8 flex-1">
                    <h3 className="text-xl font-black text-slate-800 mb-2 group-hover:text-primary transition-colors">{magnitude.name}</h3>
                    <p className="text-xs font-bold text-slate-400 line-clamp-2 leading-relaxed">
                      {magnitude.description || 'Sin descripción técnica parametrizada.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                     <div className="flex flex-col">
                       <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.15em] mb-1">Configuración</span>
                       <span className="text-sm font-black text-slate-700">ISO 17025</span>
                     </div>
                     <button 
                       onClick={() => handleConfig(magnitude)}
                       className="flex items-center gap-1.5 text-[11px] font-black text-primary hover:gap-3 transition-all"
                     >
                        Configurar <ChevronRight className="w-4 h-4" />
                     </button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingMagnitude ? 'Editar Magnitud' : 'Nueva Magnitud'}
      >
        <form onSubmit={handleSubmit} className="space-y-8">
           <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nombre Magnitude</label>
             <input 
               required
               placeholder="ej: Temperatura"
               className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
               value={newMagnitude.name}
               onChange={(e) => setNewMagnitude({ ...newMagnitude, name: e.target.value })}
             />
           </div>

           <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Descripción técnica</label>
             <textarea 
               rows={3}
               placeholder="Describe brevemente la magnitud..."
               className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none"
               value={newMagnitude.description}
               onChange={(e) => setNewMagnitude({ ...newMagnitude, description: e.target.value })}
             />
           </div>

           <div className="pt-4 flex gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 h-12 rounded-2xl font-bold border-slate-200"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1 h-12 rounded-2xl font-bold gap-2 shadow-lg shadow-primary/20 bg-primary text-white"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingMagnitude ? 'Guardar Cambios' : 'Crear Magnitud'}
              </Button>
           </div>
        </form>
      </Modal>

      {/* CONFIGURATION MODAL (The new one) */}
      <Modal 
        isOpen={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)} 
        title={`Configurar ${configMagnitude?.name}`}
      >
        <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-4 custom-scrollbar">
           <p className="text-xs font-bold text-slate-400 italic">Diligencia los parámetros de aseguramiento metrológico para esta magnitud.</p>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Unidades */}
              <div className="space-y-2 group">
                <div className="flex items-center gap-2 mb-1">
                  <Ruler className="w-4 h-4 text-primary" />
                  <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Unidades</label>
                </div>
                <textarea 
                  placeholder="ej: °C, °F, K"
                  className="w-full bg-slate-50 border-none rounded-2xl py-3 px-5 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none min-h-[80px]"
                />
              </div>

              {/* Métodos */}
              <div className="space-y-2 group">
                <div className="flex items-center gap-2 mb-1">
                  <Settings2 className="w-4 h-4 text-primary" />
                  <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Métodos</label>
                </div>
                <textarea 
                  placeholder="ej: Comparación directa, Puntos fijos"
                  className="w-full bg-slate-50 border-none rounded-2xl py-3 px-5 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none min-h-[80px]"
                />
              </div>

              {/* Modelos de Incertidumbre */}
              <div className="space-y-2 group">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-primary" />
                  <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Modelos de Incertidumbre</label>
                </div>
                <textarea 
                  placeholder="ej: GUM, Monte Carlo"
                  className="w-full bg-slate-50 border-none rounded-2xl py-3 px-5 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none min-h-[80px]"
                />
              </div>

              {/* Variables */}
              <div className="space-y-2 group">
                <div className="flex items-center gap-2 mb-1">
                  <History className="w-4 h-4 text-primary" />
                  <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Variables</label>
                </div>
                <textarea 
                  placeholder="ej: Deriva, Resolución, Repetibilidad"
                  className="w-full bg-slate-50 border-none rounded-2xl py-3 px-5 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none min-h-[80px]"
                />
              </div>

               {/* Documentación */}
              <div className="space-y-2 group">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-primary" />
                  <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Documentación</label>
                </div>
                <textarea 
                  placeholder="ej: Instructivo INS-01, Norma ISO"
                  className="w-full bg-slate-50 border-none rounded-2xl py-3 px-5 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none min-h-[80px]"
                />
              </div>

               {/* Criterios de Aceptación */}
              <div className="space-y-2 group">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-primary" />
                  <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Criterios de Aceptación</label>
                </div>
                <textarea 
                  placeholder="ej: Error < MPE, Incertidumbre < 1/3 Tolerancia"
                  className="w-full bg-slate-50 border-none rounded-2xl py-3 px-5 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none min-h-[80px]"
                />
              </div>
           </div>

           <div className="flex gap-4 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsConfigOpen(false)}
                className="flex-1 h-12 rounded-2xl font-bold border-slate-200"
              >
                Cerrar
              </Button>
              <Button 
                onClick={() => {
                  alert('Configuración guardada localmente (Demo)');
                  setIsConfigOpen(false);
                }}
                className="flex-1 h-12 rounded-2xl font-bold bg-primary text-white shadow-lg shadow-primary/20"
              >
                Guardar Configuración
              </Button>
           </div>
        </div>
      </Modal>

      {/* DELETE MODAL */}
      <Modal 
        isOpen={isDeleteOpen} 
        onClose={() => setIsDeleteOpen(false)} 
        title="¿Eliminar Magnitud?"
      >
        <div className="space-y-8 text-center">
           <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-red-50/50">
              <AlertCircle className="w-10 h-10 text-red-500" />
           </div>
           <p className="text-sm font-bold text-slate-500 leading-relaxed px-4">
             Estas a punto de eliminar la magnitud <span className="text-slate-800 font-black">"{magnitudeToDelete?.name}"</span>. 
             Esta acción no se puede deshacer y podría afectar a los equipos vinculados.
           </p>
           
           <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteOpen(false)}
                className="flex-1 h-12 rounded-2xl font-bold border-slate-200"
              >
                No, Volver
              </Button>
              <Button 
                variant="destructive"
                disabled={isSubmitting}
                onClick={handleDelete}
                className="flex-1 h-12 rounded-2xl font-bold gap-2 bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 text-white"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Sí, Eliminar
              </Button>
           </div>
        </div>
      </Modal>
    </div>
  );
}
