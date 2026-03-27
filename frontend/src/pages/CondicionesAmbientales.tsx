import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Thermometer, 
  Droplets, 
  Wind,
  Settings,
  AlertTriangle,
  Table,
  Save,
  MapPin,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '../components/ui/Modal';
import { environmentalService, type EnvironmentalRecord, type EnvironmentalLimit } from '../services/environmentalRecords';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';

export function CondicionesAmbientales() {
  const [records, setRecords] = useState<EnvironmentalRecord[]>([]);
  const [limits, setLimits] = useState<EnvironmentalLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'records' | 'limits'>('records');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { profile } = useAuth();
  const isAdmin = profile?.role?.name === 'admin';

  // Form State
  const [form, setForm] = useState<Partial<EnvironmentalRecord>>({
    area: 'Laboratorio de Metrología',
    record_date: new Date().toISOString().split('T')[0],
    record_time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    temperature: 20.0,
    humidity: 50.0,
    pressure: 1013.25,
    within_limits: true,
    recorded_by: profile?.full_name || ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recData, limData] = await Promise.all([
        environmentalService.getRecords(),
        environmentalService.getLimits()
      ]);
      setRecords(recData);
      setLimits(limData);
    } catch (error) {
      console.error('Error fetching environmental data:', error);
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
      // Validate against limits logic
      const areaLimits = limits.filter(l => l.area === form.area);
      let isWithin = true;
      areaLimits.forEach(l => {
        if (l.parameter === 'temperature' && form.temperature) {
          if (form.temperature < l.min_value || form.temperature > l.max_value) isWithin = false;
        }
        if (l.parameter === 'humidity' && form.humidity) {
           if (form.humidity < l.min_value || form.humidity > l.max_value) isWithin = false;
        }
      });
      
      await environmentalService.createRecord({ ...form, within_limits: isWithin });
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving record:', error);
    }
  };

  const resetForm = () => {
    setForm({
      area: 'Laboratorio de Metrología',
      record_date: new Date().toISOString().split('T')[0],
      record_time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      temperature: 20.0,
      humidity: 50.0,
      pressure: 1013.25,
      within_limits: true,
      recorded_by: profile?.full_name || ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Condiciones Ambientales (6.3)</h1>
          <p className="text-slate-500 font-medium">Monitoreo y control del entorno de laboratorios</p>
        </div>
        <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                onClick={() => setActiveTab(activeTab === 'records' ? 'limits' : 'records')}
                className="bg-white hover:bg-slate-50 text-slate-600 gap-2 h-11 px-4 rounded-2xl shadow-sm border-slate-100 transition-all font-bold"
            >
                {activeTab === 'records' ? <Settings className="w-5 h-5" /> : <Table className="w-5 h-5" />}
                {activeTab === 'records' ? 'Ver Límites' : 'Ver Registros'}
            </Button>
            <Button 
                onClick={() => { resetForm(); setIsModalOpen(true); }}
                className="bg-primary hover:bg-primary/90 text-white gap-2 h-11 px-6 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
                <Plus className="w-5 h-5" />
                Nuevo Registro
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-6 rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden relative group">
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
              <Thermometer className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Temperatura</p>
              <h3 className="text-2xl font-black text-slate-800">20.5 <span className="text-xs text-slate-400 font-black tracking-normal">°C</span></h3>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-5 -rotate-12 translate-x-4 translate-y-4 font-black text-7xl select-none">°C</div>
        </Card>
        <Card className="p-6 rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden relative group">
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 flex items-center justify-center text-cyan-500 group-hover:scale-110 transition-transform">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Humedad</p>
              <h3 className="text-2xl font-black text-slate-800">48.2 <span className="text-xs text-slate-400 font-black tracking-normal">% RH</span></h3>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-5 -rotate-12 translate-x-4 translate-y-4 font-black text-7xl select-none">%</div>
        </Card>
        <Card className="p-6 rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden relative group">
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
              <Wind className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Presión</p>
              <h3 className="text-2xl font-black text-slate-800">1012.5 <span className="text-xs text-slate-400 font-black tracking-normal">hPa</span></h3>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 opacity-5 -rotate-12 translate-x-4 translate-y-4 font-black text-7xl select-none">P</div>
        </Card>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
        {activeTab === 'records' ? (
          <>
            <div className="p-6 border-b border-slate-50 bg-slate-50/30">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Filtrar por área o responsable..."
                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Fecha / Hora</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Área</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-center">Temp. (°C)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-center">Hum. (%)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Estado</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Registrado por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="h-40 flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">No hay registros aún.</td>
                    </tr>
                  ) : records.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-800 tracking-tight">{new Date(record.record_date).toLocaleDateString()}</span>
                          <span className="text-[10px] font-bold text-slate-400">{record.record_time}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <MapPin className="w-3.5 h-3.5 text-slate-400" />
                           <span className="text-sm font-bold text-slate-600">{record.area}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-black text-slate-800">{record.temperature?.toFixed(1) || '--'}</td>
                      <td className="px-6 py-4 text-center font-black text-slate-800">{record.humidity?.toFixed(1) || '--'}</td>
                      <td className="px-6 py-4">
                        <div className={clsx(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border w-fit",
                          record.within_limits ? "bg-green-100 text-green-600 border-green-200" : "bg-red-100 text-red-600 border-red-200"
                        )}>
                          {record.within_limits ? 'Dentro de Límites' : 'Fuera de Límites'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500">{record.recorded_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-8 space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-800">Límites Tolerables por Área</h3>
                {isAdmin && <Button onClick={() => {}} className="bg-primary/5 hover:bg-primary/10 text-primary rounded-xl font-bold h-9">Agregar Límite</Button>}
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {limits.map(limit => (
                    <div key={limit.id} className="p-6 rounded-3xl border border-slate-100 bg-slate-50/50 space-y-4">
                       <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{limit.area}</span>
                          <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-100 text-[10px] font-bold text-slate-400">{limit.parameter}</span>
                       </div>
                       <div className="flex items-center justify-between pt-2">
                          <div className="flex flex-col">
                             <span className="text-[10px] font-bold text-slate-400 uppercase">Mín.</span>
                             <span className="text-xl font-black text-slate-800">{limit.min_value} {limit.unit}</span>
                          </div>
                          <div className="w-8 h-px bg-slate-200" />
                          <div className="flex flex-col text-right">
                             <span className="text-[10px] font-bold text-slate-400 uppercase">Máx.</span>
                             <span className="text-xl font-black text-slate-800">{limit.max_value} {limit.unit}</span>
                          </div>
                       </div>
                    </div>
                ))}
             </div>
          </div>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Condiciones Ambientales"
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Área / Laboratorio</label>
                    <select 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                        value={form.area}
                        onChange={(e) => setForm({ ...form, area: e.target.value })}
                    >
                        <option>Laboratorio de Metrología</option>
                        <option>Sala de Equipos</option>
                        <option>Área de Ensayos</option>
                        <option>Almacén de Reactivos</option>
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Tempetatura (°C)</label>
                        <input 
                            type="number" step="0.1" required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                            value={form.temperature || ''}
                            onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Humedad (%)</label>
                        <input 
                            type="number" step="0.1" required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                            value={form.humidity || ''}
                            onChange={(e) => setForm({ ...form, humidity: parseFloat(e.target.value) })}
                        />
                    </div>
                </div>
             </div>
             
             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Fecha</label>
                        <input 
                            type="date" required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                            value={form.record_date}
                            onChange={(e) => setForm({ ...form, record_date: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Hora</label>
                        <input 
                            type="time" required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                            value={form.record_time}
                            onChange={(e) => setForm({ ...form, record_time: e.target.value })}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Presión (hPa)</label>
                    <input 
                        type="number" step="0.01"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                        value={form.pressure || ''}
                        onChange={(e) => setForm({ ...form, pressure: parseFloat(e.target.value) })}
                    />
                </div>
             </div>
          </div>

          <div className="p-4 rounded-3xl bg-amber-50 border border-amber-100 text-[11px] font-bold text-amber-700 flex items-start gap-3">
             <AlertTriangle className="w-5 h-5 shrink-0" />
             El sistema validará automáticamente si los valores ingresados están dentro de los rangos configurados para el numeral 6.3 de la norma.
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-2xl font-bold text-slate-400">
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary text-white rounded-2xl px-8 font-black shadow-lg shadow-primary/20">
              <Save className="w-5 h-5 mr-3" />
              Guardar Registro
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
