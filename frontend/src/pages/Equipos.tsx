import { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Settings2, 
  Edit2, 
  Trash2, 
  Monitor, 
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  ChevronRight,
  Camera,
  Image as ImageIcon,
  X,
  Download,
  Upload,
  FileSpreadsheet
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { equipmentService, type Equipment } from '../services/equipment';
import { magnitudesService, type Magnitude } from '../services/magnitudes';
import { Modal } from '../components/ui/Modal';
import { PermissionGuard } from '../components/PermissionGuard';
import { format, addDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import clsx from 'clsx';

const statusColorMap: Record<string, string> = {
  'active': 'text-green-600 bg-green-50 border-green-100',
  'pending_calibration': 'text-orange-600 bg-orange-50 border-orange-100',
  'maintenance': 'text-blue-600 bg-blue-50 border-blue-100',
  'out_of_service': 'text-red-600 bg-red-50 border-red-100',
};

const statusIconMap: Record<string, any> = {
  'active': CheckCircle2,
  'pending_calibration': Clock,
  'maintenance': Settings2,
  'out_of_service': XCircle,
};

const statusLabelMap: Record<string, string> = {
  'active': 'Operativo',
  'pending_calibration': 'Calibración Pendiente',
  'maintenance': 'En Mantenimiento',
  'out_of_service': 'Fuera de Servicio',
};

export function Equipos() {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [magnitudes, setMagnitudes] = useState<Magnitude[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [magnitudeFilter, setMagnitudeFilter] = useState('all');

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [newEquipment, setNewEquipment] = useState<Partial<Equipment>>({
    name: '',
    brand: '',
    model: '',
    serial_number: '',
    internal_id: '',
    magnitude_id: '',
    status: 'active',
    image_url: null,
    calibration_period_days: 365,
    last_calibration_date: null,
    classification: null
  });

  // Image Preview State
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState<Equipment | null>(null);

  // CSV Import State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eData, mData] = await Promise.all([
        equipmentService.getAll(),
        magnitudesService.getAll()
      ]);
      setEquipmentList(eData);
      setMagnitudes(mData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let finalImageUrl = newEquipment.image_url;

      // Handle File Upload if changed
      if (fileInputRef.current?.files?.[0]) {
        try {
          finalImageUrl = await equipmentService.uploadImage(fileInputRef.current.files[0]);
        } catch (error) {
          console.error('Error uploading image:', error);
          alert('Error al subir la imagen. Verifica que el cubo "managemet_assets" exista en Supabase.');
        }
      }

      const eqToSave = { ...newEquipment, image_url: finalImageUrl };

      if (editingEquipment) {
        await equipmentService.update(editingEquipment.id, eqToSave);
      } else {
        await equipmentService.create(eqToSave);
      }
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving equipment:', error);
      alert('Error guardando el equipo. Revisa la base de datos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadTemplate = () => {
    if (!confirm('¿Deseas descargar la plantilla CSV para la carga masiva de equipos?')) return;
    
    // Using semicolon (;) for better compatibility with Excel in Latin America
    const headers = ['Nombre del Equipo', 'Marca', 'Modelo', 'Número de Serie', 'ID Interno', 'ID Magnitud (UUID)', 'Periodo Calibración (Días)', 'Fecha Última Calibración (AAAA-MM-DD)', 'Clasificación'];
    const example = ['Manómetro Digital', 'Fluke', '700G', 'SN123456', 'PAT-001', magnitudes[0]?.id || 'f4e33caf-9053-400c-8512-8e9b8d9e5536', '365', '2024-01-01', 'Equipo de Trabajo'];
    
    // Add UTF-8 BOM (\ufeff) so Excel recognizes special characters like accents
    const csvContent = '\ufeff' + [headers, example].map(row => row.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_inventario_equipos.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        // Handle both comma and semicolon just in case
        const delimiter = text.includes(';') ? ';' : ',';
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const data = lines.slice(1).map(line => line.split(delimiter));
        setCsvPreview(data);
      };
      reader.readAsText(file);
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile || csvPreview.length === 0) return;
    if (!confirm(`¿Estás seguro de cargar ${csvPreview.length} equipos al inventario?`)) return;

    setIsSubmitting(true);
    try {
      const equipmentToCreate = csvPreview.map(row => ({
        name: row[0],
        brand: row[1],
        model: row[2],
        serial_number: row[3],
        internal_id: row[4],
        magnitude_id: row[5],
        status: 'active' as const,
        calibration_period_days: parseInt(row[6]) || 365,
        last_calibration_date: row[7] || null,
        classification: row[8] as any || null
      }));

      await equipmentService.bulkCreate(equipmentToCreate);
      setIsCsvModalOpen(false);
      setCsvFile(null);
      setCsvPreview([]);
      fetchData();
      alert('Carga masiva completada con éxito.');
    } catch (error) {
      console.error('Error in bulk create:', error);
      alert('Error en la carga masiva. Verifica los IDs de magnitud y el formato del archivo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!equipmentToDelete) return;
    setIsSubmitting(true);
    try {
      await equipmentService.delete(equipmentToDelete.id);
      setIsDeleteOpen(false);
      setEquipmentToDelete(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting equipment:', error);
      alert('No se pudo eliminar el equipo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingEquipment(null);
    setNewEquipment({
      name: '', brand: '', model: '', serial_number: '', internal_id: '', magnitude_id: '', status: 'active', image_url: null, calibration_period_days: 365, last_calibration_date: null, classification: null
    });
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEdit = (equipment: Equipment) => {
    setEditingEquipment(equipment);
    setNewEquipment({
      name: equipment.name,
      brand: equipment.brand || '',
      model: equipment.model || '',
      serial_number: equipment.serial_number || '',
      internal_id: equipment.internal_id || '',
      magnitude_id: equipment.magnitude_id,
      status: equipment.status,
      image_url: equipment.image_url,
      calibration_period_days: equipment.calibration_period_days || 365,
      last_calibration_date: equipment.last_calibration_date,
      classification: equipment.classification
    });
    setImagePreview(equipment.image_url);
    setIsModalOpen(true);
  };

  const filteredEquipment = equipmentList.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) || 
                          e.internal_id?.toLowerCase().includes(search.toLowerCase());
    const matchesMagnitude = magnitudeFilter === 'all' || e.magnitude_id === magnitudeFilter;
    return matchesSearch && matchesMagnitude;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-800">Inventario de Equipos</h1>
          <p className="text-xs font-bold text-slate-400">Control de instrumentos de medición y aseguramiento metrológico</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
           {/* Filters */}
           <div className="flex items-center gap-3 bg-white p-1.5 rounded-3xl border border-slate-100 shadow-sm">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="ID Interno o nombre..." 
                  className="bg-transparent border-none py-2 pl-10 pr-4 text-[11px] font-black outline-none w-56 placeholder:text-slate-300"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
             </div>
             <div className="h-6 w-px bg-slate-100" />
             <div className="relative flex items-center pr-2">
                <Filter className="w-4 h-4 text-slate-400 ml-2 mr-2" />
                <select 
                  className="bg-transparent border-none text-[11px] font-black uppercase text-slate-500 outline-none cursor-pointer pr-4 hover:text-primary transition-colors"
                  value={magnitudeFilter}
                  onChange={(e) => setMagnitudeFilter(e.target.value)}
                >
                  <option value="all">Todas las Magnitudes</option>
                  {magnitudes.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
             </div>
           </div>

           <div className="flex items-center gap-3">
             <Button 
                onClick={() => setIsCsvModalOpen(true)}
                variant="outline"
                className="rounded-[1.25rem] h-12 px-6 font-black flex items-center gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all text-xs tracking-wide"
              >
                <FileSpreadsheet className="w-4 h-4" />
                IMPORTAR CSV
              </Button>

              <PermissionGuard module="equipos" action="create">
                <Button 
                  onClick={() => { resetForm(); setIsModalOpen(true); }}
                  className="rounded-[1.25rem] h-12 px-8 font-black flex items-center gap-3 shadow-xl shadow-primary/20 bg-primary text-white border-none transition-all hover:scale-[1.03] active:scale-95 text-xs tracking-wide"
                >
                  <Plus className="w-5 h-5 stroke-[3px]" />
                  NUEVO REGISTRO
                </Button>
              </PermissionGuard>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-[0_12px_45px_-12px_rgba(0,0,0,0.05)] border border-slate-50 overflow-hidden transition-all duration-500">
        {loading ? (
          <div className="p-12 space-y-6">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-16 bg-slate-50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredEquipment.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-center p-12">
             <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8 ring-8 ring-slate-50/50">
                <Monitor className="w-10 h-10 text-slate-200" />
             </div>
             <p className="text-2xl font-black text-slate-800 mb-2">Sin equipos registrados</p>
             <p className="text-sm font-bold text-slate-400 max-w-sm">No hay instrumentos que coincidan con tus filtros actuales.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="text-left py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID / Equipo</th>
                  <th className="text-left py-6 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Clasificación</th>
                  <th className="text-left py-6 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Magnitud & Marca</th>
                  <th className="text-left py-6 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Trazabilidad</th>
                  <th className="text-left py-6 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                  <th className="text-right py-6 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredEquipment.map((equipment: Equipment) => {
                  const StatusIcon = statusIconMap[equipment.status] || Monitor;
                  const statusClass = statusColorMap[equipment.status] || 'bg-slate-50 text-slate-400';
                  const magnitudeName = (equipment as any).magnitude?.name || 'General';

                  // Calibration Logic
                  let calibrationStatus = { label: 'Vigente', color: 'bg-green-500 shadow-green-100' };
                  let nextDate = 'N/A';
                  if (equipment.last_calibration_date) {
                    const next = addDays(new Date(equipment.last_calibration_date), equipment.calibration_period_days || 365);
                    nextDate = format(next, 'dd/MM/yy');
                    const diff = differenceInDays(next, new Date());
                    if (diff < 0) calibrationStatus = { label: 'Vencido', color: 'bg-red-500 shadow-red-100' };
                    else if (diff <= 30) calibrationStatus = { label: 'Próximo', color: 'bg-orange-500 shadow-orange-100' };
                  }

                  return (
                    <tr key={equipment.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-6 px-8">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-slate-50 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-100 group-hover:bg-white transition-colors">
                            {equipment.image_url ? (
                              <img src={equipment.image_url} alt={equipment.name} className="w-full h-full object-contain" />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-slate-200" />
                            )}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] font-black text-primary uppercase tracking-widest">{equipment.internal_id || 'SIN ID'}</span>
                            <span className="text-sm font-black text-slate-800 leading-tight capitalize">{equipment.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 leading-tight">S/N: {equipment.serial_number || 'N/A'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-6 px-6">
                        <div className="flex flex-col">
                           <span className={clsx(
                             "text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-wider w-fit",
                             equipment.classification === 'Equipo de Referencia' ? "bg-purple-50 text-purple-600 border border-purple-100" :
                             equipment.classification === 'Equipo de Trabajo' ? "bg-blue-50 text-blue-600 border border-blue-100" :
                             "bg-slate-50 text-slate-500 border border-slate-100"
                           )}>
                             {equipment.classification || 'Sin Clasificar'}
                           </span>
                        </div>
                      </td>
                      <td className="py-6 px-6">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                             <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">{magnitudeName}</span>
                          </div>
                          <span className="text-[11px] font-bold text-slate-500">{equipment.brand || 'Genérica'} {equipment.model ? `/ ${equipment.model}` : ''}</span>
                        </div>
                      </td>
                      <td className="py-6 px-6">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Próxima</span>
                            <span className="text-[11px] font-black text-slate-700">{nextDate}</span>
                          </div>
                          <div className={clsx("px-3 py-1 rounded-full text-[8px] font-black text-white uppercase tracking-wider shadow-lg", calibrationStatus.color)}>
                            {calibrationStatus.label}
                          </div>
                        </div>
                      </td>
                      <td className="py-6 px-6">
                        <div className={clsx("inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black transition-all duration-300", statusClass)}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusLabelMap[equipment.status].toUpperCase()}
                        </div>
                      </td>
                      <td className="py-6 px-8">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEdit(equipment)}
                            className="p-2.5 text-slate-400 hover:text-primary hover:bg-white hover:shadow-xl hover:shadow-primary/10 rounded-xl transition-all active:scale-90"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => { setEquipmentToDelete(equipment); setIsDeleteOpen(true); }}
                            className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-white hover:shadow-xl hover:shadow-red-100 rounded-xl transition-all active:scale-90"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FORM MODAL */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingEquipment ? 'Editar Instrumento' : 'Nuevo Instrumento Técnico'}
      >
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto pr-4 custom-scrollbar">
           {/* Image Upload Area */}
           <div className="relative group/pic">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-all relative overflow-hidden"
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] opacity-0 group-hover/pic:opacity-100 transition-opacity flex items-center justify-center">
                       <Camera className="w-10 h-10 text-white" />
                    </div>
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="absolute top-4 right-4 p-2 bg-white/90 rounded-xl text-red-500 shadow-xl hover:bg-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-lg mb-4 text-slate-300 group-hover/pic:text-primary group-hover/pic:scale-110 transition-all">
                       <Camera className="w-8 h-8" />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cargar fotografía del equipo</p>
                  </>
                )}
              </div>
              <input 
                type="file" 
                hidden 
                accept="image/*" 
                ref={fileInputRef}
                onChange={handleImageChange}
              />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nombre Equipo</label>
                <input required placeholder="ej: Manómetro Digital" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none" value={newEquipment.name || ""} onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Magnitud</label>
                <select required className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none" value={newEquipment.magnitude_id || ""} onChange={(e) => setNewEquipment({ ...newEquipment, magnitude_id: e.target.value })}>
                   <option value="">Seleccione magnitud</option>
                   {magnitudes.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">ID Interno</label>
                <input required placeholder="ej: PAT-001" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none" value={newEquipment.internal_id || ""} onChange={(e) => setNewEquipment({ ...newEquipment, internal_id: e.target.value })} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Marca</label>
                <input placeholder="ej: Fluke" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none" value={newEquipment.brand || ""} onChange={(e) => setNewEquipment({ ...newEquipment, brand: e.target.value })} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Modelo</label>
                <input placeholder="ej: 700G" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none" value={newEquipment.model || ""} onChange={(e) => setNewEquipment({ ...newEquipment, model: e.target.value })} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Clasificación</label>
                <select className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none" value={newEquipment.classification || ""} onChange={(e) => setNewEquipment({ ...newEquipment, classification: e.target.value as any })}>
                   <option value="">Seleccione clasificación</option>
                   <option value="Equipo de Referencia">Equipo de Referencia</option>
                   <option value="Equipo de Trabajo">Equipo de Trabajo</option>
                   <option value="Equipo Auxiliar">Equipo Auxiliar</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Número de Serie</label>
                <input placeholder="ej: SN-123456" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none" value={newEquipment.serial_number || ""} onChange={(e) => setNewEquipment({ ...newEquipment, serial_number: e.target.value })} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Última Calibración</label>
                <input type="date" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none" value={newEquipment.last_calibration_date || ""} onChange={(e) => setNewEquipment({ ...newEquipment, last_calibration_date: e.target.value })} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Periodo (Días)</label>
                <input type="number" placeholder="365" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none" value={newEquipment.calibration_period_days || ''} onChange={(e) => setNewEquipment({ ...newEquipment, calibration_period_days: parseInt(e.target.value) || 0 })} />
              </div>

              {newEquipment.last_calibration_date && newEquipment.calibration_period_days && (
                 <div className="col-span-full p-6 bg-primary/5 rounded-[2rem] border border-primary/10 flex items-center justify-between">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">Próxima Calibración Calculada:</span>
                    <span className="text-sm font-black text-slate-800">
                       {format(addDays(new Date(newEquipment.last_calibration_date), newEquipment.calibration_period_days), "dd 'de' MMMM, yyyy", { locale: es })}
                    </span>
                 </div>
              )}

              <div className="col-span-full space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Estado Operativo</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                   {Object.keys(statusLabelMap).map(s => {
                     const isSelected = newEquipment.status === s;
                     const Icon = statusIconMap[s];
                     return (
                       <button
                         key={s}
                         type="button"
                         onClick={() => setNewEquipment({ ...newEquipment, status: s as Equipment['status'] })}
                         className={clsx(
                           "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                           isSelected ? "bg-primary/5 border-primary text-primary shadow-lg shadow-primary/5" : "bg-white border-slate-50 text-slate-400 hover:border-slate-100"
                         )}
                       >
                         <Icon className="w-5 h-5" />
                         <span className="text-[10px] font-bold text-center leading-tight">{statusLabelMap[s]}</span>
                       </button>
                     );
                   })}
                </div>
              </div>
           </div>

           <div className="flex gap-4 pt-4 sticky bottom-0 bg-white/80 backdrop-blur-md pb-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-12 rounded-2xl font-black border-slate-200 uppercase text-[10px] tracking-widest">CANCELAR</Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 h-13 rounded-2xl font-black bg-primary text-white shadow-xl shadow-primary/20 uppercase text-[10px] tracking-widest gap-3">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingEquipment ? 'GUARDAR CAMBIOS' : 'VINCULAR EQUIPO'}
              </Button>
           </div>
        </form>
      </Modal>

      {/* DELETE MODAL */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirmar Eliminación">
        <div className="space-y-8 text-center py-6">
           <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-red-50/50">
              <AlertCircle className="w-12 h-12 text-red-500" />
           </div>
           <p className="text-base font-bold text-slate-600 leading-relaxed px-4">
             ¿Estás seguro de que quieres eliminar el equipo <br/>
             <span className="text-slate-900 font-black text-xl">"{equipmentToDelete?.name}"</span>?
           </p>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Esta acción eliminará también su historial vinculado.</p>
           
           <div className="flex gap-4 px-6 pt-4">
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="flex-1 h-14 rounded-[1.5rem] font-black border-slate-200">CANCELAR</Button>
              <Button variant="destructive" disabled={isSubmitting} onClick={handleDelete} className="flex-1 h-14 rounded-[1.5rem] font-black bg-red-500 hover:bg-red-600 shadow-xl shadow-red-200 text-white">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                SÍ, ELIMINAR
              </Button>
           </div>
        </div>
      </Modal>
      {/* CSV IMPORT MODAL */}
      <Modal isOpen={isCsvModalOpen} onClose={() => setIsCsvModalOpen(false)} title="Importación Masiva de Equipos" maxWidthClass="max-w-2xl">
        <div className="space-y-8 py-4">
           {/* Step 1: Template */}
           <div className="flex gap-6 items-start p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-primary flex-shrink-0">
                 <Download className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                 <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Paso 1: Descarga la Plantilla</h4>
                 <p className="text-xs font-bold text-slate-400 leading-relaxed">Descarga el archivo base con el formato correcto para asegurar que tus datos se vinculen sin errores.</p>
                 <Button onClick={handleDownloadTemplate} variant="link" className="p-0 h-auto text-primary font-black text-[10px] tracking-widest uppercase hover:no-underline flex items-center gap-2">
                    <Download className="w-3 h-3" />
                    Bajar Plantilla .CSV
                 </Button>
              </div>
           </div>

           {/* Step 2: Upload */}
           <div className="flex gap-6 items-start p-6 bg-slate-50 rounded-[2rem] border border-slate-100 relative overflow-hidden">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-primary flex-shrink-0">
                 <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-2 flex-1">
                 <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Paso 2: Sube tu Archivo</h4>
                 <p className="text-xs font-bold text-slate-400 leading-relaxed">Una vez editado el archivo con tus instrumentos, cárgalo aquí para procesar el inventario.</p>
                 
                 <div 
                   onClick={() => csvInputRef.current?.click()}
                   className={clsx(
                     "mt-4 w-full h-32 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all",
                     csvFile ? "bg-green-50 border-green-200" : "bg-white border-slate-200 hover:border-primary/30"
                   )}
                 >
                    {csvFile ? (
                      <div className="flex flex-col items-center gap-2">
                         <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                            <FileSpreadsheet className="w-6 h-6" />
                         </div>
                         <span className="text-[10px] font-black text-green-700 uppercase">{csvFile.name}</span>
                         <span className="text-[9px] font-bold text-green-500">{csvPreview.length} registros detectados</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seleccionar Archivo</span>
                        <span className="text-[9px] font-bold text-slate-300">Formato compatible: .csv</span>
                      </div>
                    )}
                 </div>
                 <input ref={csvInputRef} type="file" hidden accept=".csv" onChange={handleCsvFileChange} />
              </div>
           </div>

           {/* Footer */}
           <div className="flex gap-4 pt-4">
              <Button variant="outline" onClick={() => setIsCsvModalOpen(false)} className="flex-1 h-13 rounded-2xl font-black border-slate-200">CANCELAR</Button>
              <Button 
                disabled={!csvFile || isSubmitting} 
                onClick={handleCsvUpload} 
                className="flex-1 h-13 rounded-2xl font-black bg-primary text-white shadow-xl shadow-primary/20 gap-3"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                PROCESAR CARGA MASIVA
              </Button>
           </div>
        </div>
      </Modal>
    </div>
  );
}
