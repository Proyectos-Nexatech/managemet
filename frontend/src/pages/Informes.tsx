import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  FileText,
  ShieldCheck,
  Clock,
  MoreVertical,
  Save,
  Printer,
  FileBadge,
  Eye,
  ExternalLink,
  Settings,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '../components/ui/Modal';
import { resultReportService, type ResultReport } from '../services/resultReports';
import { reportTemplateService, type ReportTemplate } from '../services/reportTemplates';
import clsx from 'clsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const statusMap = {
  'draft': { label: 'Borrador', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  'review': { label: 'En Revisión', color: 'bg-blue-100 text-blue-600 border-blue-200' },
  'approved': { label: 'Aprobado', color: 'bg-green-100 text-green-600 border-green-200' },
  'issued': { label: 'Emitido', color: 'bg-purple-100 text-purple-600 border-purple-200' },
  'amended': { label: 'Enmendado', color: 'bg-amber-100 text-amber-600 border-amber-200' },
  'cancelled': { label: 'Cancelado', color: 'bg-red-100 text-red-600 border-red-200' },
};

const typeMap = {
  'calibration_certificate': { label: 'Certificado de Calibración', icon: FileBadge },
  'test_report': { label: 'Informe de Ensayo', icon: FileText },
  'complementary': { label: 'Anexo / Complementario', icon: ExternalLink },
};

export function Informes() {
  const [reports, setReports] = useState<ResultReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ResultReport | null>(null);
  
  // Templates State
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [form, setForm] = useState<Partial<ResultReport>>({
    type: 'calibration_certificate',
    client_name: '',
    item_description: '',
    status: 'draft',
    uncertainty_statement: 'La incertidumbre expandida se ha calculado multiplicando la incertidumbre estándar combinada por un factor de cobertura k=2...',
    conformity_statement: 'Cumple con las especificaciones del fabricante.'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reportsData, templatesData] = await Promise.all([
        resultReportService.getAll(),
        reportTemplateService.getAll()
      ]);
      setReports(reportsData);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredReports = reports.filter(r => 
    r.report_code.toLowerCase().includes(search.toLowerCase()) || 
    (r.client_name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
    r.item_description.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedReport) {
        await resultReportService.update(selectedReport.id, form);
      } else {
        await resultReportService.create(form);
      }
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving report:', error);
    }
  };

  const resetForm = () => {
    setSelectedReport(null);
    setForm({
      type: 'calibration_certificate',
      client_name: '',
      item_description: '',
      status: 'draft',
      uncertainty_statement: 'La incertidumbre expandida se ha calculado multiplicando la incertidumbre estándar combinada por un factor de cobertura k=2...',
      conformity_statement: 'Cumple con las especificaciones del fabricante.'
    });
  };

  const handleDownloadPDF = (report: ResultReport) => {
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
    doc.text('Laboratorio de Metrología e Inspección', 20, 32);
    doc.text(`CÓDIGO: ${report.report_code}`, pageWidth - 20, 25, { align: 'right' });
    doc.text(`FECHA: ${report.issue_date || new Date().toLocaleDateString()}`, pageWidth - 20, 32, { align: 'right' });

    // --- Title ---
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.text(typeMap[report.type].label.toUpperCase(), pageWidth / 2, 55, { align: 'center' });

    // --- Client & Item Info ---
    doc.setFontSize(10);
    doc.setDrawColor(241, 245, 249);
    doc.line(20, 65, pageWidth - 20, 65);

    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE:', 20, 75);
    doc.setFont('helvetica', 'normal');
    doc.text(report.client_name || 'N/A', 45, 75);

    doc.setFont('helvetica', 'bold');
    doc.text('ÍTEM/EQUIPO:', 20, 82);
    doc.setFont('helvetica', 'normal');
    doc.text(report.item_description, 45, 82);

    // --- Results Table ---
    autoTable(doc, {
      startY: 95,
      head: [['Punto de Medida', 'Valor de Referencia', 'Valor Encontrado', 'Error', 'Incertidumbre (k=2)']],
      body: [
        ['Punto 1', '10.00', '10.02', '+0.02', '0.012'],
        ['Punto 2', '20.00', '19.98', '-0.02', '0.015'],
        ['Punto 3', '50.00', '50.05', '+0.05', '0.022'],
        ['Punto 4', '100.00', '100.08', '+0.08', '0.045'],
      ],
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: 20, right: 20 },
    });

    // --- Statements ---
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFont('helvetica', 'bold');
    doc.text('DECLARACIÓN DE INCERTIDUMBRE:', 20, finalY);
    doc.setFont('helvetica', 'normal');
    const uncLines = doc.splitTextToSize(report.uncertainty_statement || 'N/A', pageWidth - 40);
    doc.text(uncLines, 20, finalY + 5);

    const confY = finalY + (uncLines.length * 5) + 10;
    doc.setFont('helvetica', 'bold');
    doc.text('DECLARACIÓN DE CONFORMIDAD:', 20, confY);
    doc.setFont('helvetica', 'normal');
    const confLines = doc.splitTextToSize(report.conformity_statement || 'N/A', pageWidth - 40);
    doc.text(confLines, 20, confY + 5);

    // --- Signatures ---
    const sigY = 260;
    doc.line(30, sigY, 90, sigY);
    doc.text('Responsable Técnico', 60, sigY + 5, { align: 'center' });
    
    doc.line(120, sigY, 180, sigY);
    doc.text('Director de Calidad', 150, sigY + 5, { align: 'center' });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Este documento es una representación electrónica de un informe metrológico generado por ManageMet.', pageWidth / 2, 285, { align: 'center' });

    doc.save(`${report.report_code}_Reporte.pdf`);
  };

  const handleUploadTemplate = async (file: File) => {
    try {
      setUploading(true);
      // Determine type based on file name or generic
      const type = 'calibration_certificate'; 
      await reportTemplateService.upload(file.name, type, file);
      fetchData();
    } catch (error) {
      console.error('Error uploading template:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta plantilla?')) return;
    try {
      await reportTemplateService.delete(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Informes de Resultados (7.8)</h1>
          <p className="text-slate-500 font-medium">Emisión de certificados y reportes conforme ISO 17025</p>
        </div>
        <Button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="bg-primary hover:bg-primary/90 text-white gap-2 h-11 px-6 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nuevo Informe
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 rounded-[2.5rem] border-none shadow-sm bg-white hover:shadow-md transition-all group">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                 <FileBadge className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Certificados</p>
                 <h3 className="text-2xl font-black text-slate-800">{reports.filter(r => r.type === 'calibration_certificate').length}</h3>
              </div>
           </div>
        </Card>
        <Card className="p-6 rounded-[2.5rem] border-none shadow-sm bg-white hover:shadow-md transition-all group">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                 <Clock className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">En Revisión</p>
                 <h3 className="text-2xl font-black text-slate-800">{reports.filter(r => r.status === 'review').length}</h3>
              </div>
           </div>
        </Card>
        <Card className="p-6 rounded-[2.5rem] border-none shadow-sm bg-white hover:shadow-md transition-all group">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                 <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Aprobados</p>
                 <h3 className="text-2xl font-black text-slate-800">{reports.filter(r => r.status === 'approved' || r.status === 'issued').length}</h3>
              </div>
           </div>
        </Card>
        <Card className="p-6 rounded-[2.5rem] border-none shadow-sm bg-white hover:shadow-md transition-all group">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                 <Printer className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Emitidos</p>
                 <h3 className="text-2xl font-black text-slate-800">{reports.filter(r => r.status === 'issued').length}</h3>
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
                placeholder="Buscar por código, cliente o ítem..."
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
               <Button 
                variant="outline" 
                onClick={() => setIsTemplatesModalOpen(true)}
                className="rounded-xl font-bold border-slate-100 h-10 px-4 text-slate-600 hover:bg-slate-50"
               >
                  <Settings className="w-4 h-4 mr-2" /> Plantillas
               </Button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Código / Tipo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Cliente e Ítem</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Estado</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Fecha Emisión</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                   <td colSpan={5} className="px-6 py-12 text-center">
                     <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <p className="text-sm font-bold text-slate-400">Cargando informes...</p>
                     </div>
                   </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                   <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold">No se encontraron informes.</td>
                </tr>
              ) : filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-black text-slate-600 border border-slate-200 uppercase w-fit tracking-wider shadow-sm">
                        {report.report_code}
                      </span>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        {(() => {
                           const Icon = typeMap[report.type].icon;
                           return <Icon className="w-3.5 h-3.5" />;
                        })()}
                        <span className="text-[10px] font-bold uppercase tracking-tight">{typeMap[report.type].label}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5 max-w-xs">
                       <span className="text-sm font-black text-slate-800 leading-tight">{report.client_name || 'Sin cliente asignado'}</span>
                       <span className="text-xs text-slate-500 font-medium truncate">{report.item_description}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                      statusMap[report.status].color
                    )}>
                      {statusMap[report.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-500">
                     {report.issue_date ? new Date(report.issue_date).toLocaleDateString() : 'Pendiente'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" className="h-9 w-9 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-primary transition-all p-0"><Eye className="w-5 h-5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDownloadPDF(report)} className="h-9 w-9 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-primary transition-all p-0"><Printer className="w-5 h-5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedReport(report)} className="h-9 w-9 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-primary transition-all p-0"><MoreVertical className="w-5 h-5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de Plantillas */}
      <Modal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        title="Gestión de Plantillas de Informe"
        maxWidthClass="max-w-2xl"
      >
        <div className="p-6 space-y-6">
           <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between mb-2">
                 <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Plantillas Disponibles</h4>
                 <div className="relative">
                    <input 
                       type="file" id="template-upload" className="hidden" 
                       onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadTemplate(file);
                       }}
                    />
                    <Button 
                       onClick={() => document.getElementById('template-upload')?.click()}
                       disabled={uploading}
                       className="bg-primary/5 hover:bg-primary/10 text-primary rounded-xl font-black h-10 px-4"
                    >
                       <Plus className="w-4 h-4 mr-2" /> 
                       {uploading ? 'Subiendo...' : 'Subir Plantilla'}
                    </Button>
                 </div>
              </div>
              
              <div className="space-y-3">
                 {templates.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                       <FileText className="w-12 h-12 text-slate-100 mx-auto mb-3" />
                       <p className="text-sm font-bold text-slate-300 italic">No hay plantillas subidas aún.</p>
                    </div>
                 ) : (
                    templates.map(tmp => (
                       <div key={tmp.id} className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-3xl hover:bg-white transition-all group">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-primary shadow-sm">
                                <FileText className="w-5 h-5" />
                             </div>
                             <div className="flex flex-col">
                                <span className="text-sm font-black text-slate-800 tracking-tight">{tmp.name}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{typeMap[tmp.type as keyof typeof typeMap].label}</span>
                             </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <Button variant="ghost" size="sm" onClick={() => window.open(tmp.file_url, '_blank')} className="rounded-xl text-slate-400 hover:text-primary transition-all"><ExternalLink className="w-4 h-4" /></Button>
                             <Button variant="ghost" size="sm" onClick={() => handleDeleteTemplate(tmp.id)} className="rounded-xl text-slate-400 hover:text-red-500 transition-all">
                                <Plus className="w-4 h-4 rotate-45" />
                             </Button>
                          </div>
                       </div>
                    ))
                 )}
              </div>
           </div>
        </div>
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedReport ? 'Detalles del Informe' : 'Generar Nuevo Informe de Resultados'}
        maxWidthClass="max-w-4xl"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Tipo de Documento</label>
                    <div className="grid grid-cols-2 gap-3">
                       {Object.entries(typeMap).map(([key, value]) => (
                          <button 
                             key={key} type="button"
                             onClick={() => setForm({ ...form, type: key as any })}
                             className={clsx(
                                "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all",
                                form.type === key ? "bg-primary/5 border-primary/20 text-primary ring-4 ring-primary/5" : "bg-white border-slate-100 text-slate-400 hover:bg-slate-50"
                             )}
                          >
                             <value.icon className="w-5 h-5" />
                             <span className="text-[10px] font-black uppercase tracking-tight text-center leading-tight">{value.label}</span>
                          </button>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nombre del Cliente</label>
                       <input 
                          type="text" required placeholder="Nombre o Razón Social..."
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                          value={form.client_name || ''}
                          onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Descripción del Ítem</label>
                       <textarea 
                          required rows={2}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all resize-none"
                          placeholder="Marca, Modelo, Serial, ID..."
                          value={form.item_description}
                          onChange={(e) => setForm({ ...form, item_description: e.target.value })}
                       />
                    </div>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="p-6 rounded-[2.5rem] bg-slate-900 text-white space-y-4">
                    <h4 className="text-[11px] font-black uppercase tracking-widest opacity-60">Declaraciones ISO 17025</h4>
                    <div className="space-y-3">
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-white/40 uppercase">Declaración de Incertidumbre</label>
                          <textarea 
                             rows={2}
                             className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-[11px] text-white/80 focus:ring-4 focus:ring-white/5 transition-all resize-none"
                             value={form.uncertainty_statement || ''}
                             onChange={(e) => setForm({ ...form, uncertainty_statement: e.target.value })}
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-white/40 uppercase">Declaración de Conformidad</label>
                          <textarea 
                             rows={2}
                             className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-[11px] text-white/80 focus:ring-4 focus:ring-white/5 transition-all resize-none"
                             value={form.conformity_statement || ''}
                             onChange={(e) => setForm({ ...form, conformity_statement: e.target.value })}
                          />
                       </div>
                    </div>
                 </div>
                 
                 <div className="flex flex-col gap-3">
                    <Button variant="ghost" className="w-full justify-start rounded-2xl border border-dashed border-slate-200 h-14 px-5 text-slate-400 hover:text-primary hover:bg-primary/5 group transition-all">
                       <Plus className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" />
                       <div className="flex flex-col items-start translate-y-[-1px]">
                          <span className="text-xs font-black text-slate-600 group-hover:text-primary">Vincular Calibración</span>
                          <span className="text-[9px] font-bold uppercase tracking-tight">Seleccionar registro de la base de datos</span>
                       </div>
                    </Button>
                 </div>
              </div>
           </div>

           <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
             <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-2xl font-bold text-slate-400">
               Cancelar
             </Button>
             <Button type="submit" className="bg-primary text-white rounded-2xl px-8 font-black shadow-lg shadow-primary/20">
               <Save className="w-5 h-5 mr-3" />
               {selectedReport ? 'Guardar Cambios' : 'Generar Informe'}
             </Button>
           </div>
        </form>
      </Modal>
    </div>
  );
}
