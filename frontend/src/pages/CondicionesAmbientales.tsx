import { useState, useEffect, useRef } from 'react';
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
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  Loader2,
  X,
  Printer
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '../components/ui/Modal';
import { environmentalService, type EnvironmentalRecord, type EnvironmentalLimit } from '../services/environmentalRecords';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  ReferenceArea,
  AreaChart,
  Area
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
// import { es } from 'date-fns/locale';

import html2canvas from 'html2canvas';

export function CondicionesAmbientales() {
  const [records, setRecords] = useState<EnvironmentalRecord[]>([]);
  const [limits, setLimits] = useState<EnvironmentalLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'records' | 'limits'>('records');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // CSV Import State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const csvInputRef = useRef<HTMLInputElement>(null);
  
  const tempChartRef = useRef<HTMLDivElement>(null);
  const humChartRef = useRef<HTMLDivElement>(null);
  const presChartRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // Limits Management State
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [editingLimit, setEditingLimit] = useState<EnvironmentalLimit | null>(null);
  const [limitForm, setLimitForm] = useState<Partial<EnvironmentalLimit>>({
    area: 'Laboratorio de Metrología',
    parameter: 'temperature',
    min_value: 18,
    max_value: 24,
    unit: '°C',
    is_active: true
  });

  const [dashboardArea, setDashboardArea] = useState<string>('Laboratorio de Metrología');

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
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = async () => {
    try {
      setIsGeneratingPdf(true);
      const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // --- Header ---
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('ManageMet', 20, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Control de Condiciones Ambientales (ISO 17025)', 20, 32);
    doc.text(`FECHA REPORTE: ${new Date().toLocaleDateString()}`, pageWidth - 20, 25, { align: 'right' });
    doc.text(`RESPONSABLE: ${profile?.full_name || 'N/A'}`, pageWidth - 20, 32, { align: 'right' });

    // --- Title ---
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.text('REGISTRO HISTÓRICO DE CONDICIONES AMBIENTALES', pageWidth / 2, 55, { align: 'center' });

    // --- Data Table ---
    autoTable(doc, {
      startY: 65,
      head: [['Fecha', 'Hora', 'Área', 'Temp (°C)', 'Hum (%)', 'Pres (hPa)', 'Estado']],
      body: records.map(r => [
        new Date(r.record_date).toLocaleDateString(),
        r.record_time,
        r.area,
        r.temperature?.toFixed(1) || '--',
        r.humidity?.toFixed(1) || '--',
        r.pressure?.toFixed(1) || '--',
        r.within_limits ? 'Dentro' : 'Fuera'
      ]),
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: 15, right: 15 },
    });

    // --- Stats Summary ---
    const avgTemp = filteredRecords.reduce((acc, r) => acc + (r.temperature || 0), 0) / (filteredRecords.length || 1);
    const avgHum = filteredRecords.reduce((acc, r) => acc + (r.humidity || 0), 0) / (filteredRecords.length || 1);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`RESUMEN ÁREA: ${dashboardArea}`, 15, (doc as any).lastAutoTable.finalY + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Promedio Temperatura: ${avgTemp.toFixed(2)} °C | Promedio Humedad: ${avgHum.toFixed(2)} %`, 15, (doc as any).lastAutoTable.finalY + 20);

    // --- Charts Section ---
    let finalY = (doc as any).lastAutoTable.finalY + 35;

    // Check if we need a new page for charts
    if (finalY > 230) {
      doc.addPage();
      finalY = 25;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ANÁLISIS GRÁFICO DE TENDENCIAS', 20, finalY);
    finalY += 15;

    const captureChart = async (ref: React.RefObject<HTMLDivElement | null>) => {
      if (!ref.current) return null;
      
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        logging: false,
        useCORS: true
      });
      
      return {
        data: canvas.toDataURL('image/png'),
        ratio: canvas.width / canvas.height
      };
    };

    const tempImg = await captureChart(tempChartRef);
    const humImg = await captureChart(humChartRef);
    const presImg = await captureChart(presChartRef);

    const drawChartWithLimits = (img: { data: string, ratio: number } | null, y: number, _label: string) => {
      if (!img) return y;
      
      const chartWidth = pageWidth - 40;
      const chartHeight = chartWidth / img.ratio;
      const footerSpace = 30; // Space for footer
      const pageHeight = doc.internal.pageSize.height;

      // If chart doesn't fit in current page, add new page
      if (y + chartHeight > pageHeight - footerSpace) {
        doc.addPage();
        y = 25; // Reset Y for new page
      }

      // Add chart image
      doc.addImage(img.data, 'PNG', 20, y, chartWidth, chartHeight);

      return y + chartHeight + 15;
    };

    let currentY = finalY;
    currentY = drawChartWithLimits(tempImg, currentY, 'TEMPERATURA');
    currentY = drawChartWithLimits(humImg, currentY, 'HUMEDAD');
    currentY = drawChartWithLimits(presImg, currentY, 'PRESIÓN');

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, 285, { align: 'center' });
      doc.text('ManageMet - Sistema de Gestión Metrológica', pageWidth / 2, 290, { align: 'center' });
    }

    doc.save(`Condiciones_Ambientales_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSubmitLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (editingLimit) {
        await environmentalService.updateLimit(editingLimit.id, limitForm);
      } else {
        await environmentalService.createLimit(limitForm);
      }
      setIsLimitModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving limit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLimit = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este límite?')) return;
    try {
      await environmentalService.updateLimit(id, { is_active: false });
      fetchData();
    } catch (error) {
      console.error('Error deleting limit:', error);
    }
  };

  const getLimitValues = (area: string, parameter: string) => {
    const limit = limits.find(l => l.area === area && l.parameter === parameter);
    if (limit) return { min: limit.min_value, max: limit.max_value };
    
    // Default fallback limits for common lab conditions
    if (parameter === 'temperature') return { min: 18, max: 24 };
    if (parameter === 'humidity') return { min: 40, max: 60 };
    if (parameter === 'pressure') return { min: 1000, max: 1020 };
    
    return null;
  };

  const tempLimits = getLimitValues(dashboardArea, 'temperature');
  const humLimits = getLimitValues(dashboardArea, 'humidity');
  const presLimits = getLimitValues(dashboardArea, 'pressure');

  const filteredRecords = records.filter(r => r.area === dashboardArea);
  
  const chartData = [...filteredRecords].reverse().map(r => ({
    time: `${format(new Date(r.record_date), 'dd/MM')} ${r.record_time}`,
    temperature: r.temperature,
    humidity: r.humidity,
    pressure: r.pressure
  }));

  const handleDownloadTemplate = () => {
    if (!confirm('¿Deseas descargar la plantilla CSV para el registro de condiciones ambientales?')) return;
    
    const headers = ['Área', 'Fecha (AAAA-MM-DD)', 'Hora (HH:MM)', 'Temperatura (°C)', 'Humedad (%)', 'Presión (hPa)', 'Responsable'];
    const example = ['Laboratorio de Metrología', new Date().toISOString().split('T')[0], '08:30', '20.5', '48.0', '1013.25', profile?.full_name || ''];
    
    const csvContent = '\ufeff' + [headers, example].map(row => row.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_condiciones_ambientales.csv');
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
    if (!confirm(`¿Estás seguro de cargar ${csvPreview.length} registros de condiciones ambientales?`)) return;

    setIsSubmitting(true);
    try {
      const recordsToCreate = csvPreview.map(row => {
        // Simple logic to determine if within limits (could be improved to match area limits)
        return {
          area: row[0],
          record_date: row[1],
          record_time: row[2],
          temperature: parseFloat(row[3]),
          humidity: parseFloat(row[4]),
          pressure: parseFloat(row[5]),
          recorded_by: row[6],
          within_limits: true // Default to true or implement logic
        };
      });

      await environmentalService.bulkCreate(recordsToCreate);
      setIsCsvModalOpen(false);
      setCsvFile(null);
      setCsvPreview([]);
      fetchData();
      alert('Carga masiva completada con éxito.');
    } catch (error) {
      console.error('Error in bulk create:', error);
      alert('Error en la carga masiva. Verifica el formato del archivo.');
    } finally {
      setIsSubmitting(false);
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
        <div className="flex flex-wrap items-center gap-2">
            <select 
                className="bg-white border-slate-100 rounded-2xl text-xs font-black h-11 px-4 shadow-sm focus:ring-4 focus:ring-primary/5 outline-none transition-all"
                value={dashboardArea}
                onChange={(e) => setDashboardArea(e.target.value)}
            >
                <option>Laboratorio de Metrología</option>
                <option>Sala de Equipos</option>
                <option>Área de Ensayos</option>
                <option>Almacén de Reactivos</option>
            </select>
            <Button 
                variant="outline" 
                onClick={() => setActiveTab(activeTab === 'records' ? 'limits' : 'records')}
                className="bg-white hover:bg-slate-50 text-slate-600 gap-2 h-11 px-4 rounded-2xl shadow-sm border-slate-100 transition-all font-bold"
            >
                {activeTab === 'records' ? <Settings className="w-5 h-5" /> : <Table className="w-5 h-5" />}
                {activeTab === 'records' ? 'Ver Límites' : 'Ver Registros'}
            </Button>
            <Button 
                onClick={() => setIsCsvModalOpen(true)}
                variant="outline"
                className="bg-white hover:bg-slate-50 text-slate-600 gap-2 h-11 px-4 rounded-2xl shadow-sm border-slate-100 transition-all font-bold"
            >
                <FileSpreadsheet className="w-5 h-5" />
                Importar CSV
            </Button>
            <Button 
                onClick={handlePrint}
                variant="outline"
                disabled={isGeneratingPdf}
                className="bg-white hover:bg-slate-50 text-slate-600 gap-2 h-11 px-4 rounded-2xl shadow-sm border-slate-100 transition-all font-bold"
            >
                {isGeneratingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
                {isGeneratingPdf ? 'Generando...' : 'Imprimir Reporte'}
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

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Temperature Chart */}
         <Card ref={tempChartRef} className="p-6 rounded-[2.5rem] border-none shadow-sm bg-white space-y-4">
            <div className="flex items-center justify-between px-2">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                     <Thermometer className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Temperatura (°C)</h4>
               </div>
               {tempLimits && (
                 <span className="text-[9px] font-bold text-slate-400">Rango: {tempLimits.min} - {tempLimits.max}</span>
               )}
            </div>
            <div className="h-64 w-full overflow-hidden">
               <ResponsiveContainer width="100%" aspect={1.8}>
                  <AreaChart data={chartData}>
                     <defs>
                        <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="time" fontSize={9} fontWeight="bold" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                     <YAxis 
                        fontSize={9} fontWeight="bold" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} 
                        domain={[
                           (dataMin: number) => Math.min(dataMin, tempLimits?.min ? tempLimits.min - 1 : 15),
                           (dataMax: number) => Math.max(dataMax, tempLimits?.max ? tempLimits.max + 1 : 30)
                        ]} 
                     />
                     <Tooltip 
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                     />
                     {tempLimits && (
                        <>
                           <ReferenceArea y1={tempLimits.min} y2={tempLimits.max} fill="#3b82f6" fillOpacity={0.05} />
                           <ReferenceLine y={tempLimits.max} stroke="#ef4444" strokeWidth={3} label={{ value: `LCS (${tempLimits.max})`, position: 'insideTopRight', fontSize: 10, fill: '#ef4444', fontWeight: 'bold', dy: -10 }} />
                           <ReferenceLine y={tempLimits.min} stroke="#ef4444" strokeWidth={3} label={{ value: `LCI (${tempLimits.min})`, position: 'insideBottomRight', fontSize: 10, fill: '#ef4444', fontWeight: 'bold', dy: 10 }} />
                           <ReferenceLine y={(tempLimits.max + tempLimits.min) / 2} stroke="#1e293b" strokeWidth={2} strokeDasharray="5 5" label={{ value: `LCC`, position: 'insideRight', fontSize: 10, fill: '#1e293b', fontWeight: 'bold', dy: -10 }} />
                        </>
                     )}
                     <Area type="monotone" dataKey="temperature" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTemp)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </Card>

         {/* Humidity Chart */}
         <Card ref={humChartRef} className="p-6 rounded-[2.5rem] border-none shadow-sm bg-white space-y-4">
            <div className="flex items-center justify-between px-2">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-500">
                     <Droplets className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Humedad (%)</h4>
               </div>
               {humLimits && (
                 <span className="text-[9px] font-bold text-slate-400">Rango: {humLimits.min} - {humLimits.max}</span>
               )}
            </div>
            <div className="h-64 w-full overflow-hidden">
               <ResponsiveContainer width="100%" aspect={1.8}>
                  <AreaChart data={chartData}>
                     <defs>
                        <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="time" fontSize={9} fontWeight="bold" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                     <YAxis 
                        fontSize={9} fontWeight="bold" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} 
                        domain={[
                           (dataMin: number) => Math.min(dataMin, humLimits?.min ? humLimits.min - 5 : 20),
                           (dataMax: number) => Math.max(dataMax, humLimits?.max ? humLimits.max + 5 : 80)
                        ]} 
                     />
                     <Tooltip 
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                     />
                     {humLimits && (
                        <>
                           <ReferenceArea y1={humLimits.min} y2={humLimits.max} fill="#06b6d4" fillOpacity={0.05} />
                           <ReferenceLine y={humLimits.max} stroke="#ef4444" strokeWidth={3} label={{ value: `LCS (${humLimits.max})`, position: 'insideTopRight', fontSize: 10, fill: '#ef4444', fontWeight: 'bold', dy: -10 }} />
                           <ReferenceLine y={humLimits.min} stroke="#ef4444" strokeWidth={3} label={{ value: `LCI (${humLimits.min})`, position: 'insideBottomRight', fontSize: 10, fill: '#ef4444', fontWeight: 'bold', dy: 10 }} />
                           <ReferenceLine y={(humLimits.max + humLimits.min) / 2} stroke="#1e293b" strokeWidth={2} strokeDasharray="5 5" label={{ value: `LCC`, position: 'insideRight', fontSize: 10, fill: '#1e293b', fontWeight: 'bold', dy: -10 }} />
                        </>
                     )}
                     <Area type="monotone" dataKey="humidity" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorHum)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </Card>

         {/* Pressure Chart */}
         <Card ref={presChartRef} className="p-6 rounded-[2.5rem] border-none shadow-sm bg-white space-y-4">
            <div className="flex items-center justify-between px-2">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center text-green-500">
                     <Wind className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Presión (hPa)</h4>
               </div>
               {presLimits && (
                 <span className="text-[9px] font-bold text-slate-400">Rango: {presLimits.min} - {presLimits.max}</span>
               )}
            </div>
            <div className="h-64 w-full overflow-hidden">
               <ResponsiveContainer width="100%" aspect={1.8}>
                  <AreaChart data={chartData}>
                     <defs>
                        <linearGradient id="colorPres" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                     <XAxis dataKey="time" fontSize={9} fontWeight="bold" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                     <YAxis 
                        fontSize={9} fontWeight="bold" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} 
                        domain={[
                           (dataMin: number) => Math.min(dataMin, presLimits?.min ? presLimits.min - 10 : 800),
                           (dataMax: number) => Math.max(dataMax, presLimits?.max ? presLimits.max + 10 : 1200)
                        ]} 
                     />
                     <Tooltip 
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                     />
                     {presLimits && (
                        <>
                           <ReferenceArea y1={presLimits.min} y2={presLimits.max} fill="#10b981" fillOpacity={0.05} />
                           <ReferenceLine y={presLimits.max} stroke="#ef4444" strokeWidth={3} label={{ value: `LCS (${presLimits.max})`, position: 'insideTopRight', fontSize: 10, fill: '#ef4444', fontWeight: 'bold', dy: -10 }} />
                           <ReferenceLine y={presLimits.min} stroke="#ef4444" strokeWidth={3} label={{ value: `LCI (${presLimits.min})`, position: 'insideBottomRight', fontSize: 10, fill: '#ef4444', fontWeight: 'bold', dy: 10 }} />
                           <ReferenceLine y={(presLimits.max + presLimits.min) / 2} stroke="#1e293b" strokeWidth={2} strokeDasharray="5 5" label={{ value: `LCC`, position: 'insideRight', fontSize: 10, fill: '#1e293b', fontWeight: 'bold', dy: -10 }} />
                        </>
                     )}
                     <Area type="monotone" dataKey="pressure" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPres)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
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
                  ) : filteredRecords.map((record) => (
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
                {isAdmin && (
                  <Button 
                    onClick={() => {
                      setEditingLimit(null);
                      setLimitForm({
                        area: 'Laboratorio de Metrología',
                        parameter: 'temperature',
                        min_value: 18,
                        max_value: 24,
                        unit: '°C',
                        is_active: true
                      });
                      setIsLimitModalOpen(true);
                    }} 
                    className="bg-primary text-white rounded-xl font-bold h-9 px-4 shadow-lg shadow-primary/20"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Límite
                  </Button>
                )}
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {limits.length === 0 ? (
                  <div className="col-span-full p-12 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                    <Settings className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No hay límites configurados. Usa el botón superior para agregar uno.</p>
                  </div>
                ) : limits.map(limit => (
                    <div key={limit.id} className="p-6 rounded-[2rem] border border-slate-100 bg-slate-50/50 space-y-4 group hover:border-primary/20 transition-all">
                       <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{limit.area}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{limit.parameter === 'temperature' ? 'Temperatura' : limit.parameter === 'humidity' ? 'Humedad' : 'Presión'}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-slate-400 hover:text-primary"
                              onClick={() => {
                                setEditingLimit(limit);
                                setLimitForm(limit);
                                setIsLimitModalOpen(true);
                              }}
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-500"
                              onClick={() => handleDeleteLimit(limit.id)}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                       </div>
                       <div className="flex items-center justify-between pt-2">
                          <div className="flex flex-col">
                             <span className="text-[10px] font-bold text-slate-400 uppercase">Mín.</span>
                             <span className="text-xl font-black text-slate-800">{limit.min_value} <span className="text-xs text-slate-400">{limit.unit}</span></span>
                          </div>
                          <div className="w-8 h-px bg-slate-200" />
                          <div className="flex flex-col text-right">
                             <span className="text-[10px] font-bold text-slate-400 uppercase">Máx.</span>
                             <span className="text-xl font-black text-slate-800">{limit.max_value} <span className="text-xs text-slate-400">{limit.unit}</span></span>
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

      {/* CSV IMPORT MODAL */}
      <Modal isOpen={isCsvModalOpen} onClose={() => setIsCsvModalOpen(false)} title="Importación Masiva de Condiciones Ambientales" maxWidthClass="max-w-2xl">
        <div className="space-y-8 py-4 p-6">
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
                 <p className="text-xs font-bold text-slate-400 leading-relaxed">Una vez editado el archivo con los registros, cárgalo aquí para procesar la información.</p>
                 
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

      {/* LIMIT CONFIG MODAL */}
      <Modal 
        isOpen={isLimitModalOpen} 
        onClose={() => setIsLimitModalOpen(false)} 
        title={editingLimit ? "Editar Límite" : "Configurar Nuevo Límite"}
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleSubmitLimit} className="p-6 space-y-6">
           <div className="space-y-4">
              <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Área / Laboratorio</label>
                  <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                      value={limitForm.area}
                      onChange={(e) => setLimitForm({ ...limitForm, area: e.target.value })}
                  >
                      <option>Laboratorio de Metrología</option>
                      <option>Sala de Equipos</option>
                      <option>Área de Ensayos</option>
                      <option>Almacén de Reactivos</option>
                  </select>
              </div>

              <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Parámetro</label>
                  <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                      value={limitForm.parameter}
                      onChange={(e) => {
                        const param = e.target.value;
                        let unit = '°C';
                        if (param === 'humidity') unit = '%';
                        if (param === 'pressure') unit = 'hPa';
                        setLimitForm({ ...limitForm, parameter: param, unit });
                      }}
                  >
                      <option value="temperature">Temperatura</option>
                      <option value="humidity">Humedad</option>
                      <option value="pressure">Presión Atmosférica</option>
                  </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Mínimo</label>
                      <input 
                          type="number" step="0.1" required
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                          value={limitForm.min_value}
                          onChange={(e) => setLimitForm({ ...limitForm, min_value: parseFloat(e.target.value) })}
                      />
                  </div>
                  <div className="space-y-2">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Máximo</label>
                      <input 
                          type="number" step="0.1" required
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                          value={limitForm.max_value}
                          onChange={(e) => setLimitForm({ ...limitForm, max_value: parseFloat(e.target.value) })}
                      />
                  </div>
              </div>
           </div>

           <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
             <Button variant="ghost" onClick={() => setIsLimitModalOpen(false)} className="rounded-2xl font-bold text-slate-400">
               Cancelar
             </Button>
             <Button type="submit" disabled={isSubmitting} className="bg-primary text-white rounded-2xl px-8 font-black shadow-lg shadow-primary/20">
               {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-3" />}
               {editingLimit ? 'Actualizar Límite' : 'Guardar Límite'}
             </Button>
           </div>
        </form>
      </Modal>
    </div>
  );
}
