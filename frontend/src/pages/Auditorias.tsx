import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  ClipboardCheck, 
  CheckCircle2, 
  Clock, 
  Filter,
  ListChecks,
  AlertTriangle,
  Save
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '../components/ui/Modal';
import { auditService, type Audit, type ChecklistItem, type AuditFinding } from '../services/audits';
import clsx from 'clsx';

const typeMap = {
  'internal': { label: 'Interna', color: 'bg-blue-100 text-blue-600 border-blue-200' },
  'external': { label: 'Externa', color: 'bg-purple-100 text-purple-600 border-purple-200' },
  'follow_up': { label: 'Seguimiento', color: 'bg-amber-100 text-amber-600 border-amber-200' },
};

const statusMap = {
  'planned': { label: 'Planificada', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  'in_progress': { label: 'En Curso', color: 'bg-blue-100 text-blue-600 border-blue-200' },
  'completed': { label: 'Completada', color: 'bg-green-100 text-green-600 border-green-200' },
  'cancelled': { label: 'Cancelada', color: 'bg-red-50 text-red-400 border-red-100' },
};

const resultColors: Record<string, string> = {
  'conforming': 'bg-green-100 text-green-600 border-green-200',
  'non_conforming': 'bg-red-100 text-red-600 border-red-200',
  'observation': 'bg-amber-100 text-amber-600 border-amber-200',
  'not_applicable': 'bg-slate-50 text-slate-400 border-slate-100',
  'pending': 'bg-white text-slate-400 border-slate-200',
};

const resultLabels: Record<string, string> = {
  'conforming': 'Conforme',
  'non_conforming': 'No Conforme',
  'observation': 'Observación',
  'not_applicable': 'N/A',
  'pending': 'Pendiente',
};

export function Auditorias() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'checklist' | 'findings'>('info');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [findings, setFindings] = useState<AuditFinding[]>([]);

  const [newAudit, setNewAudit] = useState<Partial<Audit>>({
    title: '',
    type: 'internal',
    standard: 'ISO 17025',
    lead_auditor: '',
    planned_date: new Date().toISOString().split('T')[0],
    status: 'planned'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await auditService.getAll();
      setAudits(data);
    } catch (error) {
      console.error('Error fetching audits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const fetchDetailData = async (id: string) => {
    try {
      const [cl, fd] = await Promise.all([
        auditService.getChecklist(id),
        auditService.getFindings(id),
      ]);
      setChecklist(cl);
      setFindings(fd);
    } catch (error) {
      console.error('Error fetching detail:', error);
    }
  };

  const handleOpenDetail = (audit: Audit) => {
    setSelectedAudit(audit);
    fetchDetailData(audit.id);
    setIsDetailOpen(true);
    setActiveTab('info');
  };

  const stats = useMemo(() => ({
    planned: audits.filter(a => a.status === 'planned').length,
    inProgress: audits.filter(a => a.status === 'in_progress').length,
    findingsOpen: audits.reduce((acc, a) => acc + (a.audit_findings?.length || 0), 0),
    completed: audits.filter(a => a.status === 'completed').length,
  }), [audits]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await auditService.create(newAudit);
      setIsModalOpen(false);
      setNewAudit({ title: '', type: 'internal', standard: 'ISO 17025', lead_auditor: '', planned_date: new Date().toISOString().split('T')[0], status: 'planned' });
      fetchData();
    } catch (error) {
      console.error('Error creating audit:', error);
    }
  };

  const handleLoadChecklist = async () => {
    if (!selectedAudit) return;
    try {
      await auditService.generateISOChecklist(selectedAudit.id);
      fetchDetailData(selectedAudit.id);
    } catch (error) {
      console.error('Error loading checklist:', error);
    }
  };

  const handleResultChange = async (itemId: string, result: string) => {
    try {
      await auditService.updateChecklistResult(itemId, result);
      fetchDetailData(selectedAudit!.id);
    } catch (error) {
      console.error('Error updating result:', error);
    }
  };

  const handleGenerateFinding = async (item: ChecklistItem) => {
    if (!selectedAudit) return;
    try {
      await auditService.addFinding({
        audit_id: selectedAudit.id,
        checklist_item_id: item.id,
        finding_type: item.result === 'non_conforming' ? 'non_conformity' : 'observation',
        description: `Hallazgo en cláusula ${item.clause}: ${item.requirement}`,
        clause_ref: item.clause,
        severity: item.result === 'non_conforming' ? 'mayor' : 'menor',
      });
      fetchDetailData(selectedAudit.id);
    } catch (error) {
      console.error('Error generating finding:', error);
    }
  };

  const filteredAudits = audits.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.audit_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-800 uppercase">Auditorías</h1>
          <p className="text-xs font-bold text-slate-400">Planificación, checklists ISO y registro de hallazgos (ISO 19011 / 17025 §8.8).</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Código o título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-[1.25rem] py-3.5 pl-11 pr-4 text-[11px] font-black outline-none focus:ring-4 focus:ring-primary/5 transition-all shadow-sm"
            />
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="rounded-[1.25rem] h-13 px-8 font-black flex items-center gap-3 shadow-xl shadow-primary/20 transition-all hover:scale-[1.03] active:scale-95"
          >
            <Plus className="w-5 h-5 stroke-[3px]" />
            NUEVA AUDITORÍA
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-[2.5rem] border-none bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3.5 bg-blue-50 rounded-2xl"><ClipboardCheck className="w-5 h-5 text-blue-500" /></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Planificadas</span>
          </div>
          <span className="text-3xl font-black text-slate-800 tracking-tighter">{stats.planned}</span>
        </Card>
        <Card className="rounded-[2.5rem] border-none bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3.5 bg-amber-50 rounded-2xl"><Clock className="w-5 h-5 text-amber-500" /></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">En Curso</span>
          </div>
          <span className="text-3xl font-black text-slate-800 tracking-tighter">{stats.inProgress}</span>
        </Card>
        <Card className="rounded-[2.5rem] border-none bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3.5 bg-red-50 rounded-2xl"><AlertTriangle className="w-5 h-5 text-red-500" /></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hallazgos</span>
          </div>
          <span className="text-3xl font-black text-slate-800 tracking-tighter">{stats.findingsOpen}</span>
        </Card>
        <Card className="rounded-[2.5rem] border-none bg-slate-900 p-6 shadow-xl shadow-slate-200">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3.5 bg-white/10 rounded-2xl"><CheckCircle2 className="w-5 h-5 text-green-400" /></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completadas</span>
          </div>
          <span className="text-3xl font-black text-white tracking-tighter">{stats.completed}</span>
        </Card>
      </div>

      {/* Table */}
      <Card className="rounded-[2.5rem] border-none shadow-[0_12px_45px_-12px_rgba(0,0,0,0.05)] bg-white overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-5 h-5 text-slate-800" />
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Programa de Auditorías</h2>
          </div>
          <button className="p-2 text-slate-400 hover:text-slate-800 transition-colors"><Filter className="w-5 h-5" /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/30">
                <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Código</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Auditoría</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Tipo</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Auditor Líder</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Fecha</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Hallazgos</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [1, 2, 3, 4].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="py-8 px-8"><div className="h-4 bg-slate-100 rounded-full w-full" /></td>
                  </tr>
                ))
              ) : filteredAudits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-300">No hay auditorías registradas.</td>
                </tr>
              ) : filteredAudits.map(audit => (
                <tr key={audit.id} onClick={() => handleOpenDetail(audit)} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                  <td className="py-6 px-8">
                    <span className="text-[11px] font-black text-slate-800 border-b-2 border-primary/20">{audit.audit_code}</span>
                  </td>
                  <td className="py-6 px-8">
                    <span className="text-sm font-black text-slate-800 group-hover:text-primary transition-colors">{audit.title}</span>
                  </td>
                  <td className="py-6 px-8">
                    <span className={clsx("text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border", typeMap[audit.type as keyof typeof typeMap]?.color)}>
                      {typeMap[audit.type as keyof typeof typeMap]?.label}
                    </span>
                  </td>
                  <td className="py-6 px-8">
                    <span className="text-[11px] font-bold text-slate-500">{audit.lead_auditor}</span>
                  </td>
                  <td className="py-6 px-8">
                    <span className="text-[11px] font-bold text-slate-400">{new Date(audit.planned_date).toLocaleDateString()}</span>
                  </td>
                  <td className="py-6 px-8">
                    <span className="text-xs font-black text-red-500">{audit.audit_findings?.length || 0}</span>
                  </td>
                  <td className="py-6 px-8 text-right">
                    <span className={clsx("text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border", statusMap[audit.status as keyof typeof statusMap]?.color)}>
                      {statusMap[audit.status as keyof typeof statusMap]?.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`Auditoría: ${selectedAudit?.audit_code || ''}`}>
        {selectedAudit && (
          <div className="space-y-6">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
              {(['info', 'checklist', 'findings'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    "flex-1 py-2.5 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                    activeTab === tab ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {tab === 'info' ? 'General' : tab === 'checklist' ? 'Checklist ISO' : 'Hallazgos'}
                </button>
              ))}
            </div>

            {/* Info Tab */}
            {activeTab === 'info' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Título</p>
                    <p className="text-sm font-bold text-slate-800">{selectedAudit.title}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Norma Base</p>
                      <p className="text-xs font-bold text-slate-700">{selectedAudit.standard}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tipo</p>
                      <span className={clsx("text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-xl border", typeMap[selectedAudit.type as keyof typeof typeMap]?.color)}>
                        {typeMap[selectedAudit.type as keyof typeof typeMap]?.label}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Auditor Líder</p>
                      <p className="text-xs font-bold text-slate-700">{selectedAudit.lead_auditor}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Área Auditada</p>
                      <p className="text-xs font-bold text-slate-700">{selectedAudit.auditee_area || 'General'}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100/50">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Objetivo</p>
                  <p className="text-sm font-bold text-blue-700 italic">"{selectedAudit.objective || 'Verificar conformidad con la norma aplicable.'}"</p>
                </div>
                {selectedAudit.scope && (
                  <div className="bg-purple-50/50 p-6 rounded-[2rem] border border-purple-100/50">
                    <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-2">Alcance</p>
                    <p className="text-sm font-bold text-purple-700">{selectedAudit.scope}</p>
                  </div>
                )}
              </div>
            )}

            {/* Checklist Tab */}
            {activeTab === 'checklist' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {checklist.length} cláusulas cargadas
                  </p>
                  {checklist.length === 0 && (
                    <Button onClick={handleLoadChecklist} className="h-9 px-4 rounded-xl text-[10px] font-black bg-primary text-white gap-2">
                      <ListChecks className="w-4 h-4" /> CARGAR CHECKLIST ISO 17025
                    </Button>
                  )}
                </div>

                {checklist.length > 0 && (
                  <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {checklist.map(item => (
                      <div key={item.id} className="bg-white border border-slate-100 p-4 rounded-2xl hover:shadow-md transition-all group">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-lg">{item.clause}</span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-700 leading-relaxed">{item.requirement}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <select
                              value={item.result}
                              onChange={(e) => handleResultChange(item.id, e.target.value)}
                              className={clsx("text-[9px] font-black uppercase px-3 py-1.5 rounded-xl border outline-none cursor-pointer", resultColors[item.result])}
                            >
                              {Object.entries(resultLabels).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                            {(item.result === 'non_conforming' || item.result === 'observation') && (
                              <button
                                onClick={() => handleGenerateFinding(item)}
                                title="Generar hallazgo"
                                className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Findings Tab */}
            {activeTab === 'findings' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{findings.length} hallazgos registrados</p>
                </div>
                {findings.length === 0 ? (
                  <p className="text-center py-8 text-[10px] font-bold text-slate-400">No hay hallazgos. Evalúa el checklist para generar hallazgos.</p>
                ) : (
                  <div className="space-y-3">
                    {findings.map(f => (
                      <div key={f.id} className="bg-white border border-slate-100 p-5 rounded-[2rem] hover:shadow-md transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={clsx("text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border",
                                f.finding_type === 'non_conformity' ? 'bg-red-100 text-red-600 border-red-200' :
                                f.finding_type === 'observation' ? 'bg-amber-100 text-amber-600 border-amber-200' :
                                'bg-blue-100 text-blue-600 border-blue-200'
                              )}>
                                {f.finding_type === 'non_conformity' ? 'No Conformidad' : f.finding_type === 'observation' ? 'Observación' : 'Oportunidad'}
                              </span>
                              {f.clause_ref && <span className="text-[10px] font-black text-primary">§{f.clause_ref}</span>}
                            </div>
                            <p className="text-sm font-bold text-slate-800">{f.description}</p>
                          </div>
                          <span className={clsx("text-[9px] font-black uppercase px-2 py-1 rounded-lg border",
                            f.severity === 'critica' ? 'bg-red-100 text-red-600' : f.severity === 'mayor' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                          )}>
                            {f.severity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create Audit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Planificar Nueva Auditoría">
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Título de la Auditoría</label>
            <input required placeholder="ej: Auditoría Interna SGC Q1 2026" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" value={newAudit.title} onChange={(e) => setNewAudit({ ...newAudit, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tipo</label>
              <select className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold outline-none" value={newAudit.type} onChange={(e) => setNewAudit({ ...newAudit, type: e.target.value as Audit['type'] })}>
                <option value="internal">Interna</option>
                <option value="external">Externa</option>
                <option value="follow_up">Seguimiento</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Norma Base</label>
              <select className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold outline-none" value={newAudit.standard} onChange={(e) => setNewAudit({ ...newAudit, standard: e.target.value })}>
                <option value="ISO 17025">ISO 17025:2017</option>
                <option value="ISO 9001">ISO 9001:2015</option>
                <option value="ISO 15189">ISO 15189:2022</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Auditor Líder</label>
              <input required placeholder="Nombre completo" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold outline-none" value={newAudit.lead_auditor} onChange={(e) => setNewAudit({ ...newAudit, lead_auditor: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Fecha Planificada</label>
              <input type="date" required className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold outline-none" value={newAudit.planned_date} onChange={(e) => setNewAudit({ ...newAudit, planned_date: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Objetivo</label>
            <textarea rows={2} placeholder="Objetivo de la auditoría..." className="w-full bg-slate-50 border-none rounded-3xl py-4 px-6 text-sm font-bold outline-none resize-none" value={newAudit.objective || ''} onChange={(e) => setNewAudit({ ...newAudit, objective: e.target.value })} />
          </div>
          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-13 rounded-2xl font-black border-slate-200 uppercase">cancelar</Button>
            <Button type="submit" className="flex-1 h-13 rounded-2xl font-black bg-primary text-white shadow-xl shadow-primary/20 uppercase gap-3">
              <Save className="w-5 h-5" /> planificar auditoría
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
