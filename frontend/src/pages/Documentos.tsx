import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  Files, 
  ShieldCheck, 
  History, 
  Loader2, 
  Download, 
  MoreVertical,
  ExternalLink,
  Filter,
  BarChart3,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '../components/ui/Modal';
import { documentService, type Document } from '../services/documents';
import clsx from 'clsx';

const typeMap = {
  'quality_manual': { label: 'Manual de Calidad', icon: ShieldCheck, color: 'bg-primary/5 text-primary border-primary/10' },
  'procedure': { label: 'Procedimiento', icon: FileText, color: 'bg-blue-50 text-blue-500 border-blue-100' },
  'format': { label: 'Formato', icon: Files, color: 'bg-orange-50 text-orange-500 border-orange-100' },
  'instruction': { label: 'Instructivo', icon: FileText, color: 'bg-slate-50 text-slate-500 border-slate-100' },
  'registry': { label: 'Registro', icon: History, color: 'bg-green-50 text-green-500 border-green-100' },
};

const statusMap = {
  'draft': { label: 'Borrador', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  'under_review': { label: 'En Revisión', color: 'bg-blue-100 text-blue-600 border-blue-200' },
  'approved': { label: 'Aprobado/Vigente', color: 'bg-green-100 text-green-600 border-green-200' },
  'archived': { label: 'Obsoleto', color: 'bg-red-100 text-red-600 border-red-200' },
  'expired': { label: 'Vencido', color: 'bg-orange-100 text-orange-600 border-orange-200' },
};

export function Documentos() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [newDoc, setNewDoc] = useState<Partial<Document>>({
    name: '',
    code: '',
    version: '1.0',
    type: 'procedure',
    status: 'draft'
  });

  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'approvals'>('details');
  const [versions, setVersions] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await documentService.getDocuments();
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching docs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchDetailData = async (doc: Document) => {
    try {
      const [hist, apps] = await Promise.all([
        documentService.getVersionHistory(doc.id),
        documentService.getApprovals(doc.id)
      ]);
      setVersions(hist);
      setApprovals(apps);
    } catch (error) {
       console.error('Error fetching detail data:', error);
    }
  };

  const handleOpenDetail = (doc: Document) => {
    setSelectedDoc(doc);
    fetchDetailData(doc);
    setIsDetailOpen(true);
    setActiveTab('details');
  };

  const stats = useMemo(() => {
    return {
      total: documents.length,
      approved: documents.filter(d => d.status === 'approved').length,
      drafts: documents.filter(d => ['draft', 'under_review'].includes(d.status)).length,
      critical: documents.filter(d => d.type === 'procedure').length
    };
  }, [documents]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let file_url = null;
      if (uploadFile) {
        file_url = await documentService.uploadFile(uploadFile);
      }
      
      await documentService.createDocument({
        ...newDoc,
        file_url,
        approval_date: newDoc.status === 'approved' ? new Date().toISOString() : null
      });

      setIsModalOpen(false);
      setNewDoc({ name: '', code: '', version: '1.0', type: 'procedure', status: 'draft' });
      setUploadFile(null);
      fetchData();
    } catch (error) {
      console.error('Error creating doc:', error);
      alert('Error registrando documento. Verifica que la tabla "documents" exista en Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDocs = documents.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-800">Sistema Normativo (DMS)</h1>
          <p className="text-xs font-bold text-slate-400">Control de documentos y registros según ISO 17025.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 shadow-sm" />
            <input 
              type="text" 
              placeholder="Código o nombre..." 
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
            CREAR DOCUMENTO
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <Card className="rounded-[2.5rem] border-none bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-3">
               <div className="p-3.5 bg-blue-50 rounded-2xl">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
               </div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Vigentes</span>
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-3xl font-black text-slate-800 tracking-tighter">{stats.approved}</span>
               <span className="text-[10px] font-black text-green-500 tracking-wide leading-none">Aprobados</span>
            </div>
         </Card>
         <Card className="rounded-[2.5rem] border-none bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-3">
               <div className="p-3.5 bg-orange-50 rounded-2xl">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
               </div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Borradores</span>
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-3xl font-black text-slate-800 tracking-tighter">{stats.drafts}</span>
               <span className="text-[10px] font-black text-orange-500 tracking-wide leading-none">En proceso</span>
            </div>
         </Card>
         <Card className="rounded-[2.5rem] border-none bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-3">
               <div className="p-3.5 bg-primary/5 rounded-2xl">
                  <FileCheck2 className="w-5 h-5 text-primary" />
               </div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Catálogo</span>
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-3xl font-black text-slate-800 tracking-tighter">{stats.total}</span>
               <span className="text-[10px] font-black text-slate-400 tracking-wide leading-none">Documentos</span>
            </div>
         </Card>
         <Card className="rounded-[2.5rem] border-none bg-slate-900 p-6 shadow-xl shadow-slate-200">
            <div className="flex items-center gap-4 mb-3">
               <div className="p-3.5 bg-white/10 rounded-2xl">
                  <ShieldCheck className="w-5 h-5 text-white" />
               </div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Críticos</span>
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-3xl font-black text-white tracking-tighter">{stats.critical}</span>
               <span className="text-[10px] font-black text-slate-500 tracking-wide leading-none uppercase">Estratégicos</span>
            </div>
         </Card>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-[0_12px_45px_-12px_rgba(0,0,0,0.05)] bg-white overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
           <div className="flex items-center gap-3">
              <Files className="w-5 h-5 text-slate-800" />
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Listado Maestro de Documentos</h2>
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
                <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Documento</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Categoría</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Versión</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Fecha Aprobación</th>
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
              ) : filteredDocs.length === 0 ? (
                <tr>
                   <td colSpan={6} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-2 opacity-30">
                         <Files className="w-12 h-12" />
                         <p className="text-xs font-black uppercase tracking-widest">Catálogo vacío</p>
                      </div>
                   </td>
                </tr>
              ) : filteredDocs.map((doc) => (
                <tr key={doc.id} onClick={() => handleOpenDetail(doc)} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                  <td className="py-6 px-8">
                     <span className="text-[11px] font-black text-slate-800 border-b-2 border-primary/20">
                        {doc.code}
                     </span>
                  </td>
                  <td className="py-6 px-8">
                     <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                           <span className="text-sm font-black text-slate-800 leading-tight group-hover:text-primary transition-colors">{doc.name}</span>
                           <span className={clsx("text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 mt-1", statusMap[doc.status as keyof typeof statusMap]?.color || 'text-slate-400')}>
                              {doc.status === 'approved' && <FileCheck2 className="w-3 h-3" />}
                              {statusMap[doc.status as keyof typeof statusMap]?.label || doc.status.toUpperCase()}
                           </span>
                        </div>
                     </div>
                  </td>
                  <td className="py-6 px-8">
                     <span className={clsx("text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border inline-flex items-center gap-2", typeMap[doc.type as keyof typeof typeMap]?.color || 'bg-slate-50 text-slate-400 border-slate-100')}>
                        {(() => {
                          const Icon = typeMap[doc.type as keyof typeof typeMap]?.icon || FileText;
                          return <Icon className="w-3.5 h-3.5" />;
                        })()}
                        {typeMap[doc.type as keyof typeof typeMap]?.label || doc.type}
                     </span>
                  </td>
                  <td className="py-6 px-8">
                     <span className="text-[10px] font-black text-slate-500 bg-slate-100/50 px-2 py-1 rounded-lg">
                        v{doc.version}
                     </span>
                  </td>
                  <td className="py-6 px-8">
                     <span className="text-[11px] font-bold text-slate-400">
                        {doc.approval_date ? new Date(doc.approval_date).toLocaleDateString() : 'Pendiente'}
                     </span>
                  </td>
                  <td className="py-6 px-8 text-right">
                     <div className="flex items-center justify-end gap-2">
                        {doc.file_url ? (
                           <button 
                             className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-all active:scale-95" 
                             onClick={(e) => { e.stopPropagation(); window.open(doc.file_url!, '_blank'); }}
                             title="Ver Documento"
                           >
                             <ExternalLink className="w-5 h-5" />
                           </button>
                        ) : (
                           <div className="p-2.5 text-slate-200">
                              <Files className="w-5 h-5" />
                           </div>
                        )}
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo Documento Estratégico">
         <form onSubmit={handleCreate} className="space-y-6">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nombre del Documento / Formato</label>
               <input required placeholder="ej: Procedimiento General de Calibración" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" value={newDoc.name} onChange={(e) => setNewDoc({...newDoc, name: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Código</label>
                  <input required placeholder="PRO-PRE-01" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" value={newDoc.code} onChange={(e) => setNewDoc({...newDoc, code: e.target.value})} />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Versión Actual</label>
                  <input required className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" value={newDoc.version} onChange={(e) => setNewDoc({...newDoc, version: e.target.value})} />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tipo de Documento</label>
                  <select 
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                    value={newDoc.type}
                    onChange={(e) => setNewDoc({...newDoc, type: e.target.value})}
                  >
                    {Object.entries(typeMap).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Estado Inicial</label>
                  <select 
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                    value={newDoc.status}
                    onChange={(e) => setNewDoc({...newDoc, status: e.target.value as Document['status']})}
                  >
                    <option value="draft">Borrador / En revisión</option>
                    <option value="approved">Vigente / Aprobado</option>
                    <option value="archived">Obsoleto / Archivado</option>
                  </select>
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Cargar Archivo (PDF, DOCX)</label>
               <div className="relative border-2 border-dashed border-slate-100 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-3 hover:border-primary/30 transition-all bg-slate-50/50">
                  <Plus className="w-8 h-8 text-primary/30" />
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{uploadFile ? uploadFile.name : 'Seleccionar Documento'}</span>
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
               </div>
            </div>

            <div className="flex gap-4 pt-4">
               <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-13 rounded-2xl font-black border-slate-200">CANCELAR</Button>
               <Button type="submit" disabled={isSubmitting} className="flex-1 h-13 rounded-2xl font-black bg-primary text-white shadow-xl shadow-primary/20 gap-3">
                 {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                 APROBAR REGISTRO
               </Button>
            </div>
         </form>
      </Modal>

      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Gestión de Documento DMS">
        {selectedDoc && (
          <div className="space-y-6">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
              {(['details', 'history', 'approvals'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    "flex-1 py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    activeTab === tab ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {tab === 'details' ? 'Detalles' : tab === 'history' ? 'Historial v.' : 'Flujo'}
                </button>
              ))}
            </div>

            {activeTab === 'details' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Código</p>
                    <p className="text-xs font-bold text-slate-800">{selectedDoc.code}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Versión</p>
                    <p className="text-xs font-bold text-slate-800">v{selectedDoc.version}</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Estado Actual</p>
                  <p className={clsx("text-xs font-bold", statusMap[selectedDoc.status as keyof typeof statusMap]?.color || 'text-slate-800')}>
                    {statusMap[selectedDoc.status as keyof typeof statusMap]?.label || selectedDoc.status}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                   <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Norte de Cambio / Notas</p>
                   <p className="text-xs font-bold text-slate-600 italic">"{selectedDoc.revision_notes || 'Sin notas de cambio registradas'}"</p>
                </div>
                {selectedDoc.file_url && (
                   <Button onClick={() => window.open(selectedDoc.file_url!, '_blank')} className="w-full h-12 rounded-2xl bg-slate-900 text-white gap-2">
                      <Download className="w-5 h-5" /> VER ARCHIVO ACTUAL
                   </Button>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar animate-in fade-in slide-in-from-right-4 duration-300">
                {versions.length === 0 && <p className="text-center py-8 text-[10px] font-bold text-slate-400">No hay versiones anteriores.</p>}
                {versions.map(v => (
                  <div key={v.id} className="bg-white border border-slate-100 p-4 rounded-2xl hover:shadow-sm transition-all flex items-center justify-between group">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800">v{v.version}</span>
                        <span className="text-[10px] font-bold text-slate-400">{new Date(v.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{v.revision_notes}</p>
                    </div>
                    {v.file_url && (
                      <button onClick={() => window.open(v.file_url!, '_blank')} className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-all">
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'approvals' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="relative pl-8 space-y-8 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  <div className="relative">
                    <div className={clsx("absolute -left-8 top-1 w-7 h-7 rounded-full flex items-center justify-center ring-4 ring-white", selectedDoc.status === 'draft' ? "bg-orange-400" : "bg-green-500")}>
                      <Plus className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800">Creación / Borrador</p>
                      <p className="text-[10px] font-bold text-slate-400">Iniciado el {new Date(selectedDoc.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Dynamic Approvals Log */}
                  {approvals.map((app) => (
                    <div key={app.id} className="relative">
                      <div className={clsx(
                        "absolute -left-8 top-1 w-7 h-7 rounded-full flex items-center justify-center ring-4 ring-white transition-all",
                        app.status === 'approved' ? "bg-green-500" : app.status === 'rejected' ? "bg-red-500" : "bg-blue-500"
                      )}>
                        {app.step === 'review' ? <FileText className="w-4 h-4 text-white" /> : <ShieldCheck className="w-4 h-4 text-white" />}
                      </div>
                      <div className="flex flex-col">
                        <p className="text-xs font-black text-slate-800">
                          {app.step === 'review' ? 'Revisión Técnica' : 'Aprobación Calidad'} 
                          <span className={clsx("ml-2 px-1.5 py-0.5 rounded text-[8px] uppercase", app.status === 'approved' ? 'bg-green-100 text-green-600' : app.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600')}>
                            {app.status === 'approved' ? 'Hecho' : app.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                          </span>
                        </p>
                        <p className="text-[10px] font-bold text-slate-400">{app.assigned_to}</p>
                        {app.comments && <p className="text-[10px] text-slate-500 italic mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">"{app.comments}"</p>}
                      </div>
                    </div>
                  ))}

                  {/* Fallback Static if no approvals yet */}
                  {approvals.length === 0 && selectedDoc.status !== 'draft' && (
                    <div className="relative opacity-50">
                      <div className="absolute -left-8 top-1 w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center ring-4 ring-white">
                        <Loader2 className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-400">Procesando Flujo...</p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedDoc.status === 'draft' && (
                   <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100/50 space-y-4">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest text-center">Acciones de Flujo</p>
                      <Button 
                        onClick={() => documentService.requestApproval(selectedDoc.id, 'Jefe de Laboratorio', 'review').then(() => { fetchData(); fetchDetailData(selectedDoc); setIsDetailOpen(false); })} 
                        className="w-full h-13 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200"
                      >
                         SOLICITAR REVISIÓN
                      </Button>
                   </div>
                )}

                {selectedDoc.status === 'under_review' && (
                   <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Control de Calidad</p>
                      <div className="flex gap-4">
                        <Button 
                          onClick={() => {
                            const role = selectedDoc.reviewer_name && !selectedDoc.approver_name ? 'reviewer' : 'approver';
                            documentService.approveDocument(selectedDoc, role, `Aprobado en paso: ${role}`)
                              .then(() => { fetchData(); fetchDetailData(selectedDoc); setIsDetailOpen(false); });
                          }}
                          className="flex-1 h-13 rounded-2xl bg-green-500 text-white shadow-lg shadow-green-200"
                        >
                          APROBAR
                        </Button>
                        <Button 
                          onClick={() => documentService.rejectDocument(selectedDoc.id, 'Solicitud de corrección técnica.')
                            .then(() => { fetchData(); fetchDetailData(selectedDoc); setIsDetailOpen(false); })}
                          variant="outline" 
                          className="flex-1 h-13 rounded-2xl border-red-200 text-red-500"
                        >
                          RECHAZAR
                        </Button>
                      </div>
                   </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
