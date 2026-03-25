import { useState, useEffect, useCallback } from 'react';
import { 
  Building2, 
  Settings2, 
  GraduationCap, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  Loader2,
  FileCheck2,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '../components/ui/Modal';
import { PermissionGuard } from '../components/PermissionGuard';
import { jobPositionsService, type JobPosition, type JobProfile, type EducationRequirement } from '../services/jobPositions';
import { personnelService, type Competency } from '../services/personnel';
import clsx from 'clsx';

export function ConfiguracionCargos() {
  const [activeTab, setActiveTab] = useState<'positions' | 'profiles' | 'education'>('positions');
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<JobPosition | null>(null);
  
  const [profiles, setProfiles] = useState<JobProfile[]>([]);
  const [educationReqs, setEducationReqs] = useState<EducationRequirement[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Position Modal
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<JobPosition | null>(null);
  const [newPosition, setNewPosition] = useState<Partial<JobPosition>>({ name: '', department: '', description: '', is_active: true });

  // Add Req Modal
  const [isEducationModalOpen, setIsEducationModalOpen] = useState(false);
  const [newEducationReq, setNewEducationReq] = useState<Partial<EducationRequirement>>({ req_type: 'degree', description: '', is_mandatory: true });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [posData, compData] = await Promise.all([
        jobPositionsService.getJobPositions(),
        personnelService.getCompetencies()
      ]);
      setPositions(posData);
      setCompetencies(compData);
      if (posData.length > 0 && !selectedPosition) {
        setSelectedPosition(posData[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPosition]);

  const fetchPositionDetails = useCallback(async (positionId: string) => {
    try {
      const [profData, eduData] = await Promise.all([
        jobPositionsService.getJobProfiles(positionId),
        jobPositionsService.getEducationRequirements(positionId)
      ]);
      setProfiles(profData);
      setEducationReqs(eduData);
    } catch (error) {
      console.error('Error fetching position details:', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedPosition) {
      fetchPositionDetails(selectedPosition.id);
    }
  }, [selectedPosition]);

  const handleSavePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingPosition) {
        await jobPositionsService.updateJobPosition(editingPosition.id, newPosition);
      } else {
        const added = await jobPositionsService.createJobPosition(newPosition);
        setSelectedPosition(added);
      }
      setIsPositionModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving position:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveProfileLevel = async (competencyId: string, level: 'basic' | 'intermediate' | 'expert', mandatory: boolean) => {
    if (!selectedPosition) return;
    try {
      await jobPositionsService.saveJobProfile({
        job_position_id: selectedPosition.id,
        competency_id: competencyId,
        required_level: level,
        is_mandatory: mandatory
      });
      fetchPositionDetails(selectedPosition.id);
    } catch (error) {
      console.error('Error saving profile level:', error);
    }
  };

  const handleSelectCompetencyLevel = (competencyId: string, value: string) => {
    if (!value) {
      // Find and delete if exists
      const existing = profiles.find(p => p.competency_id === competencyId);
      if (existing) {
        jobPositionsService.deleteJobProfile(existing.id).then(() => {
          fetchPositionDetails(selectedPosition!.id);
        });
      }
    } else {
      const [level, mandatoryStr] = value.split('-');
      handleSaveProfileLevel(competencyId, level as 'basic' | 'intermediate' | 'expert', mandatoryStr === 'true');
    }
  };

  const handleSaveEducation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPosition) return;
    setIsSubmitting(true);
    try {
      await jobPositionsService.createEducationRequirement({
        ...newEducationReq,
        job_position_id: selectedPosition.id
      });
      setIsEducationModalOpen(false);
      setNewEducationReq({ req_type: 'degree', description: '', is_mandatory: true });
      fetchPositionDetails(selectedPosition.id);
    } catch (error) {
      console.error('Error saving education req:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEducation = async (id: string) => {
    try {
      await jobPositionsService.deleteEducationRequirement(id);
      fetchPositionDetails(selectedPosition!.id);
    } catch (error) {
      console.error('Error deleting education req:', error);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800">Cargos y Perfiles</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">
            Configuración de requisitos y competencias base por cargo (ISO 17025 Cláusula 6.2)
          </p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        {[
          { id: 'positions', label: 'Cargos del Laboratorio', icon: Building2 },
          { id: 'profiles', label: 'Perfiles de Competencia', icon: Settings2 },
          { id: 'education', label: 'Requisitos Educativos', icon: GraduationCap }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'positions' | 'profiles' | 'education')}
            className={clsx(
              "flex items-center gap-2 px-6 py-4 font-bold text-sm border-b-2 transition-all",
              activeTab === tab.id 
                ? "border-primary text-primary" 
                : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar for selecting position (visible in profiles and education tabs) */}
          {(activeTab === 'profiles' || activeTab === 'education') && (
            <div className="lg:col-span-1 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Seleccionar Cargo</h3>
              <div className="space-y-2">
                {positions.map(pos => (
                  <button
                    key={pos.id}
                    onClick={() => setSelectedPosition(pos)}
                    className={clsx(
                      "w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all border",
                      selectedPosition?.id === pos.id 
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                        : "bg-white text-slate-600 border-slate-100 hover:border-primary/30"
                    )}
                  >
                    <div className="block truncate">{pos.name}</div>
                    <div className={clsx("text-[10px] mt-1 uppercase tracking-widest", selectedPosition?.id === pos.id ? "text-primary-foreground/70" : "text-slate-400")}>
                      {pos.department}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className={activeTab === 'positions' ? "lg:col-span-4" : "lg:col-span-3"}>
            
            {/* CARGOS TAB */}
            {activeTab === 'positions' && (
              <div className="space-y-6">
                <div className="flex justify-end">
                  <PermissionGuard module="config_cargos" action="create">
                    <Button 
                      onClick={() => {
                        setEditingPosition(null);
                        setNewPosition({ name: '', department: '', description: '', is_active: true });
                        setIsPositionModalOpen(true);
                      }}
                      className="rounded-[1.25rem] h-12 px-6 font-black bg-primary text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      AÑADIR CARGO
                    </Button>
                  </PermissionGuard>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {positions.map(pos => (
                    <Card key={pos.id} className="border-none shadow-sm rounded-[2rem] bg-white overflow-hidden p-6 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <PermissionGuard module="config_cargos" action="update">
                          <button 
                            onClick={() => {
                              setEditingPosition(pos);
                              setNewPosition(pos);
                              setIsPositionModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-primary transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </PermissionGuard>
                      </div>
                      <h3 className="text-xl font-black text-slate-800 mb-1 leading-tight">{pos.name}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">{pos.department}</p>
                      <p className="text-sm font-medium text-slate-500 line-clamp-3 mb-6">{pos.description}</p>
                      <div className="flex items-center gap-2">
                        <span className={clsx("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", pos.is_active ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                          {pos.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </Card>
                  ))}
                  {positions.length === 0 && (
                    <div className="col-span-full p-12 text-center text-slate-400 font-bold bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                      No hay cargos configurados.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PERFILES TAB */}
            {activeTab === 'profiles' && selectedPosition && (
              <Card className="border-none shadow-sm rounded-[2rem] bg-white overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary">
                    <Settings2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800">Matriz de Competencias Requeridas</h2>
                    <p className="text-sm font-bold text-slate-400">Perfil: <span className="text-primary">{selectedPosition.name}</span></p>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  {competencies.length === 0 ? (
                    <p className="text-center text-slate-400 py-8">No hay competencias definidas en el sistema.</p>
                  ) : (
                    <div className="border border-slate-100 rounded-3xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Competencia</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nivel Requerido</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {competencies.map(comp => {
                            const profile = profiles.find(p => p.competency_id === comp.id);
                            // value format: "level-isMandatory" or ""
                            let selectValue = "";
                            if (profile) {
                              selectValue = `${profile.required_level}-${profile.is_mandatory}`;
                            }

                            return (
                              <tr key={comp.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-4">
                                  <div className="font-bold text-slate-800 text-sm">{comp.name}</div>
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    {comp.magnitude?.name || 'General'}
                                  </div>
                                </td>
                                <td className="p-4">
                                  <select 
                                    className={clsx(
                                      "bg-slate-50 border-none rounded-xl py-2 px-4 text-xs font-bold outline-none ring-2 ring-transparent focus:ring-primary/20 transition-all",
                                      profile ? "bg-primary/5 text-primary" : "text-slate-400"
                                    )}
                                    value={selectValue}
                                    onChange={(e) => handleSelectCompetencyLevel(comp.id, e.target.value)}
                                  >
                                    <option value="">-- No Requerida --</option>
                                    <optgroup label="Obligatoria (Nivel Mínimo)">
                                      <option value="basic-true">Básico Obligatorio</option>
                                      <option value="intermediate-true">Intermedio Obligatorio</option>
                                      <option value="expert-true">Experto Obligatorio</option>
                                    </optgroup>
                                    <optgroup label="Deseable (Opcional)">
                                      <option value="basic-false">Básico Deseable</option>
                                      <option value="intermediate-false">Intermedio Deseable</option>
                                      <option value="expert-false">Experto Deseable</option>
                                    </optgroup>
                                  </select>
                                </td>
                                <td className="p-4">
                                  {profile ? (
                                    <div className="flex items-center gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                                      <span className="text-xs font-bold text-green-600">Configurado</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs font-bold text-slate-400">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* EDUCATION TAB */}
            {activeTab === 'education' && selectedPosition && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm">
                  <div>
                    <h2 className="text-xl font-black text-slate-800">Formación y Experiencia Requerida</h2>
                    <p className="text-sm font-bold text-slate-400">Perfil: <span className="text-primary">{selectedPosition.name}</span></p>
                  </div>
                  <PermissionGuard module="config_cargos" action="create">
                    <Button 
                      onClick={() => setIsEducationModalOpen(true)}
                      className="rounded-[1rem] h-10 px-4 font-black bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      AÑADIR REQUISITO
                    </Button>
                  </PermissionGuard>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {educationReqs.map(req => (
                    <Card key={req.id} className="border-none shadow-sm rounded-2xl bg-white p-5 flex items-center justify-between border-l-4 border-l-primary">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                          {req.req_type === 'degree' && <GraduationCap className="w-5 h-5" />}
                          {req.req_type === 'course' && <FileCheck2 className="w-5 h-5" />}
                          {req.req_type === 'experience' && <Building2 className="w-5 h-5" />}
                          {req.req_type === 'other' && <AlertTriangle className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {req.req_type === 'degree' ? 'Educación Formal' : req.req_type === 'course' ? 'Formación Especifica' : req.req_type === 'experience' ? 'Experiencia Mínima' : 'Otro Requisito'}
                            </span>
                            {req.is_mandatory ? (
                              <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-500 text-[9px] font-bold uppercase tracking-wider">Obligatorio</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-500 text-[9px] font-bold uppercase tracking-wider">Deseable</span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-slate-700">{req.description}</p>
                        </div>
                      </div>
                      <PermissionGuard module="config_cargos" action="delete">
                        <button onClick={() => handleDeleteEducation(req.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </PermissionGuard>
                    </Card>
                  ))}
                  {educationReqs.length === 0 && (
                    <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 font-bold text-sm">
                      No se han configurado requisitos de formación para este cargo.
                    </div>
                  )}
                </div>
              </div>
            )}
            
          </div>
        </div>
      )}

      {/* Position Modal */}
      <Modal isOpen={isPositionModalOpen} onClose={() => setIsPositionModalOpen(false)} title={editingPosition ? "Editar Cargo" : "Nuevo Cargo"}>
        <form onSubmit={handleSavePosition} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nombre del Cargo</label>
            <input required className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" value={newPosition.name || ''} onChange={(e) => setNewPosition({...newPosition, name: e.target.value})} placeholder="Ej: Director Técnico" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Área / Departamento</label>
            <input required className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" value={newPosition.department || ''} onChange={(e) => setNewPosition({...newPosition, department: e.target.value})} placeholder="Ej: Laboratorio" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Descripción</label>
            <textarea className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 h-24 resize-none" value={newPosition.description || ''} onChange={(e) => setNewPosition({...newPosition, description: e.target.value})} placeholder="Responsabilidades principales..." />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <input type="checkbox" id="isActive" className="w-4 h-4 rounded text-primary border-slate-300 focus:ring-primary/20" checked={newPosition.is_active || false} onChange={(e) => setNewPosition({...newPosition, is_active: e.target.checked})} />
            <label htmlFor="isActive" className="text-sm font-bold text-slate-600 cursor-pointer">Cargo Activo</label>
          </div>
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" onClick={() => setIsPositionModalOpen(false)} className="flex-1 rounded-2xl font-black">CANCELAR</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 rounded-2xl font-black bg-primary text-white">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              GUARDAR
            </Button>
          </div>
        </form>
      </Modal>

      {/* Education Req Modal */}
      <Modal isOpen={isEducationModalOpen} onClose={() => setIsEducationModalOpen(false)} title="Añadir Requisito Educativo">
        <form onSubmit={handleSaveEducation} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tipo de Requisito</label>
            <select required className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" value={newEducationReq.req_type} onChange={(e) => setNewEducationReq({...newEducationReq, req_type: e.target.value as EducationRequirement['req_type']})}>
              <option value="degree">Educación Formal (Título)</option>
              <option value="course">Formación / Cursos</option>
              <option value="experience">Experiencia Profesional</option>
              <option value="other">Otro Requisito</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Descripción del Requisito</label>
            <textarea required className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 h-24 resize-none" value={newEducationReq.description || ''} onChange={(e) => setNewEducationReq({...newEducationReq, description: e.target.value})} placeholder="Ej: Ingeniero Electrónico o afín..." />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <input type="checkbox" id="isMandatory" className="w-4 h-4 rounded text-primary border-slate-300 focus:ring-primary/20" checked={newEducationReq.is_mandatory || false} onChange={(e) => setNewEducationReq({...newEducationReq, is_mandatory: e.target.checked})} />
            <label htmlFor="isMandatory" className="text-sm font-bold text-slate-600 cursor-pointer">Requisito Obligatorio (Esencial)</label>
          </div>
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" onClick={() => setIsEducationModalOpen(false)} className="flex-1 rounded-2xl font-black">CANCELAR</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 rounded-2xl font-black bg-primary text-white">
              <Plus className="w-4 h-4 mr-2" />
              AÑADIR
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
