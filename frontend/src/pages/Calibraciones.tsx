import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Settings2, 
  Calendar, 
  FileCheck2, 
  Activity, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MoreVertical,
  Filter,
  BarChart4,
  Download,
  Upload,
  FileSpreadsheet
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '../components/ui/Modal';
import { calibrationService, type Calibration } from '../services/calibration';
import { equipmentService, type Equipment } from '../services/equipment';
import { personnelService, type Personnel } from '../services/personnel';
import clsx from 'clsx';

const statusMap = {
  'completed': { label: 'Completado', color: 'bg-green-50 text-green-600 border-green-100', icon: CheckCircle2 },
  'pending': { label: 'Pendiente', color: 'bg-orange-50 text-orange-600 border-orange-100', icon: Clock },
  'cancelled': { label: 'Cancelado', color: 'bg-red-50 text-red-600 border-red-100', icon: XCircle },
};

const resultMap = {
  'pass': { color: 'text-green-500 bg-green-50 border-green-100' },
  'fail': { color: 'text-red-500 bg-red-50 border-red-100' },
  'limited': { color: 'text-orange-500 bg-orange-50 border-orange-100' },
};

export function Calibraciones() {
  const [calibrations, setCalibrations] = useState<Calibration[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newCalibration, setNewCalibration] = useState<Partial<Calibration>>({
    equipment_id: '',
    technician_id: '',
    calibration_date: new Date().toISOString().split('T')[0],
    result: 'pass',
    status: 'completed',
    certificate_no: '',
    uncertainty: '',
    notes: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [c, e, p] = await Promise.all([
        calibrationService.getCalibrations(),
        equipmentService.getAll(),
        personnelService.getPersonnel()
      ]);
      setCalibrations(c);
      setEquipmentList(e);
      setPersonnelList(p);
    } catch (error) {
      console.error('Error fetching:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    return {
      total: calibrations.length,
      completed: calibrations.filter(c => c.status === 'completed').length,
      pending: calibrations.filter(c => c.status === 'pending').length,
      passRate: calibrations.length > 0 
        ? Math.round((calibrations.filter(c => c.result === 'pass').length / calibrations.length) * 100) 
        : 0
    };
  }, [calibrations]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await calibrationService.createCalibration(newCalibration);
      setIsModalOpen(false);
      setNewCalibration({
         equipment_id: '',
         technician_id: '',
         calibration_date: new Date().toISOString().split('T')[0],
         result: 'pass',
         status: 'completed',
         certificate_no: '',
         uncertainty: '',
         notes: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error creating:', error);
      alert('Error registrando la calibración. Asegúrate de ejecutar el SQL en Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadCSVTemplate = () => {
    // Usamos punto y coma (;) para compatibilidad con Excel en Latinoamérica
    const headers = "Punto;Valor_Referencia;Valor_Leido;Unidad;Error\n";
    const exampleRows = "1;10,00;10,02;mm;0,02\n2;20,00;19,98;mm;-0,02\n3;50,00;50,05;mm;0,05";
    const csvContent = "data:text/csv;charset=utf-8," + headers + exampleRows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "plantilla_calibracion_managemet.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const rows = text.split('\n');
        let formattedNotes = "PUNTOS CARGADOS VIA EXCEL/CSV:\n\n";
        
        rows.slice(1).forEach(row => {
          if (row.trim()) {
            // Detectar si el separador es coma o punto y coma
            const delimiter = row.includes(';') ? ';' : ',';
            const [punto, ref, lect, unit, error] = row.split(delimiter);
            formattedNotes += `• Punto ${punto}: Ref ${ref}${unit} | Leído ${lect}${unit} | Err ${error}\n`;
          }
        });
        setNewCalibration({ ...newCalibration, notes: formattedNotes });
      };
      reader.readAsText(file);
    }
  };

  const filteredCalibrations = calibrations.filter(c => 
     c.certificate_no.toLowerCase().includes(search.toLowerCase()) || 
     c.equipment?.name.toLowerCase().includes(search.toLowerCase()) ||
     c.technician?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-800">Control de Calibraciones</h1>
          <p className="text-xs font-bold text-slate-400">Trazabilidad metrológica y aseguramiento de la validez de los resultados.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 shadow-sm" />
            <input 
              type="text" 
              placeholder="Certificado o equipo..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-[1.25rem] py-3.5 pl-11 pr-4 text-[11px] font-black outline-none focus:ring-4 focus:ring-primary/5 transition-all shadow-sm"
            />
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="rounded-[1.25rem] h-13 px-8 font-black flex items-center gap-3 shadow-xl shadow-primary/20 bg-primary border-none transition-all hover:scale-[1.03] active:scale-95 text-white"
          >
            <Plus className="w-5 h-5 stroke-[3px]" />
            NUEVA CALIBRACIÓN
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <Card className="rounded-[2.5rem] border-none bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-3">
               <div className="p-3.5 bg-blue-50 rounded-2xl">
                  <Activity className="w-5 h-5 text-blue-500" />
               </div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Ejecutadas</span>
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-3xl font-black text-slate-800 tracking-tighter">{stats.total}</span>
               <span className="text-[10px] font-black text-slate-400 tracking-wide leading-none">Registros</span>
            </div>
         </Card>
         <Card className="rounded-[2.5rem] border-none bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-3">
               <div className="p-3.5 bg-green-50 rounded-2xl">
                  <FileCheck2 className="w-5 h-5 text-green-500" />
               </div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Cumplimiento</span>
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-3xl font-black text-slate-800 tracking-tighter">{stats.completed}</span>
               <span className="text-[10px] font-black text-green-500 tracking-wide leading-none">Completadas</span>
            </div>
         </Card>
         <Card className="rounded-[2.5rem] border-none bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-3">
               <div className="p-3.5 bg-orange-50 rounded-2xl">
                  <Calendar className="w-5 h-5 text-orange-500" />
               </div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Pendientes</span>
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-3xl font-black text-slate-800 tracking-tighter">{stats.pending}</span>
               <span className="text-[10px] font-black text-orange-500 tracking-wide leading-none">Para Programar</span>
            </div>
         </Card>
         <Card className="rounded-[2.5rem] border-none bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-3">
               <div className="p-3.5 bg-primary/5 rounded-2xl">
                  <BarChart4 className="w-5 h-5 text-primary" />
               </div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Tasa Passer</span>
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-3xl font-black text-slate-800 tracking-tighter">{stats.passRate}%</span>
               <span className="text-[10px] font-black text-slate-400 tracking-wide leading-none">Exitosas</span>
            </div>
         </Card>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-[0_12px_45px_-12px_rgba(0,0,0,0.05)] bg-white overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
           <div className="flex items-center gap-3">
              <Settings2 className="w-5 h-5 text-slate-800" />
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Historial de Calibraciones</h2>
           </div>
           <button className="p-2 text-slate-400 hover:text-slate-800 transition-colors">
              <Filter className="w-5 h-5" />
           </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/30">
                <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Certificado</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Equipo</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Técnico</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Fecha</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Resultado</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="py-8 px-8"><div className="h-4 bg-slate-100 rounded-full w-full"></div></td>
                  </tr>
                ))
              ) : filteredCalibrations.length === 0 ? (
                <tr>
                   <td colSpan={6} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2 opacity-30">
                         <FileCheck2 className="w-12 h-12" />
                         <p className="text-xs font-black uppercase tracking-widest">No hay registros aún</p>
                      </div>
                   </td>
                </tr>
              ) : filteredCalibrations.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-6 px-8">
                     <span className="text-[11px] font-black text-primary bg-primary/5 px-2.5 py-1.5 rounded-lg border border-primary/10">
                        {c.certificate_no}
                     </span>
                  </td>
                  <td className="py-6 px-8">
                     <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-800">{c.equipment?.name}</span>
                        <span className="text-[10px] font-bold text-slate-400">{c.equipment?.internal_id}</span>
                     </div>
                  </td>
                  <td className="py-6 px-8">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                          {c.technician?.name.substring(0,2).toUpperCase()}
                       </div>
                       <span className="text-xs font-bold text-slate-600">{c.technician?.name}</span>
                    </div>
                  </td>
                  <td className="py-6 px-8">
                     <div className="flex items-center gap-2 text-[10px] font-black text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-300" />
                        {new Date(c.calibration_date).toLocaleDateString()}
                     </div>
                  </td>
                  <td className="py-6 px-8">
                     <span className={clsx("text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-xl border", resultMap[c.result]?.color)}>
                        {c.result}
                     </span>
                  </td>
                  <td className="py-6 px-8 text-right">
                     <div className="flex items-center justify-end gap-1.5">
                        {(() => {
                          const StatusIcon = statusMap[c.status]?.icon;
                          return (
                            <span className={clsx("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border", statusMap[c.status]?.color)}>
                               {StatusIcon && <StatusIcon className="w-3.5 h-3.5" />}
                               {statusMap[c.status]?.label}
                            </span>
                          );
                        })()}
                        <button className="p-2 text-slate-300 hover:text-slate-800 transition-colors">
                           <MoreVertical className="w-4 h-4" />
                        </button>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Calibración" maxWidthClass="max-w-4xl">
         <form onSubmit={handleCreate} className="space-y-8">
            <div className="grid grid-cols-2 gap-8">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Equipo a Calibrar</label>
                  <select 
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                    value={newCalibration.equipment_id}
                    onChange={(e) => setNewCalibration({...newCalibration, equipment_id: e.target.value})}
                  >
                    <option value="">Seleccionar Equipo...</option>
                    {equipmentList.map(e => <option key={e.id} value={e.id}>{e.name} ({e.internal_id})</option>)}
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Técnico Responsable</label>
                  <select 
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                    value={newCalibration.technician_id}
                    onChange={(e) => setNewCalibration({...newCalibration, technician_id: e.target.value})}
                  >
                    <option value="">Seleccionar Técnico...</option>
                    {personnelList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
               </div>
            </div>

            <div className="grid grid-cols-3 gap-8">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">No. Certificado</label>
                  <input required placeholder="CERT-2024-001" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" value={newCalibration.certificate_no} onChange={(e) => setNewCalibration({...newCalibration, certificate_no: e.target.value})} />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Fecha de Calibración</label>
                  <input type="date" required className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" value={newCalibration.calibration_date} onChange={(e) => setNewCalibration({...newCalibration, calibration_date: e.target.value})} />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Incertidumbre (k=2)</label>
                  <input placeholder="ej: 0.0012 mm" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" value={newCalibration.uncertainty || ''} onChange={(e) => setNewCalibration({...newCalibration, uncertainty: e.target.value})} />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Resultado Final</label>
                  <div className="flex gap-3">
                    {(['pass', 'fail', 'limited'] as const).map((res) => (
                      <button
                        key={res}
                        type="button"
                        onClick={() => setNewCalibration({...newCalibration, result: res})}
                        className={clsx(
                          "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                          newCalibration.result === res 
                            ? "bg-slate-900 text-white border-slate-900 shadow-lg" 
                            : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                        )}
                      >
                        {res === 'pass' ? 'Satisfactorio' : res === 'fail' ? 'No Satisfactorio' : 'Limitado'}
                      </button>
                    ))}
                  </div>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Estado del Registro</label>
                  <div className="flex gap-3">
                    {(['pending', 'completed'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setNewCalibration({...newCalibration, status: st})}
                        className={clsx(
                          "flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                          newCalibration.status === st 
                            ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                            : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                        )}
                      >
                        {st === 'pending' ? 'Borrador' : 'Finalizar Log'}
                      </button>
                    ))}
                  </div>
               </div>
            </div>
            <div className="grid grid-cols-1 gap-8">
               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tabla de Datos / Observaciones</label>
                     <div className="flex gap-2">
                        <button 
                           type="button" onClick={downloadCSVTemplate}
                           className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-500 text-[9px] font-black uppercase tracking-wider hover:bg-blue-100 transition-all border border-blue-100/50"
                        >
                           <Download className="w-3.5 h-3.5" /> Descargar Plantilla
                        </button>
                        <div className="relative">
                           <input type="file" accept=".csv" className="hidden" id="csv-upload" onChange={handleFileUpload} />
                           <button 
                              type="button" onClick={() => document.getElementById('csv-upload')?.click()}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-500 text-[9px] font-black uppercase tracking-wider hover:bg-emerald-100 transition-all border border-emerald-100/50"
                           >
                              <Upload className="w-3.5 h-3.5" /> Cargar CSV con Datos
                           </button>
                        </div>
                     </div>
                  </div>
                  <textarea 
                    rows={4} 
                    placeholder="Escribe aquí los resultados o carga un archivo CSV para autocompletar..." 
                    className="w-full bg-slate-50 border-none rounded-3xl py-5 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none resize-none leading-relaxed" 
                    value={newCalibration.notes || ''} 
                    onChange={(e) => setNewCalibration({...newCalibration, notes: e.target.value})} 
                  />
                  {newCalibration.notes?.includes('PUNTOS CARGADOS') && (
                     <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase">
                        <FileSpreadsheet className="w-4 h-4" /> Datos de puntos vinculados correctamente
                     </div>
                  )}
               </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-slate-50">
               <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-13 rounded-2xl font-black border-slate-200">CANCELAR</Button>
               <Button type="submit" disabled={isSubmitting} className="flex-1 h-13 rounded-2xl font-black bg-primary text-white shadow-xl shadow-primary/20 gap-3">
                 {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                 VALIDAR Y REGISTRAR
               </Button>
            </div>
         </form>
      </Modal>
    </div>
  );
}
