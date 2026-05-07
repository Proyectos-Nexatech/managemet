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
  CheckCircle2,
  ShieldCheck,
  Eye,
  FileText
} from 'lucide-react';


import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '../components/ui/Modal';
import { PermissionGuard } from '../components/PermissionGuard';
import { jobPositionsService, type JobPosition, type JobProfile, type EducationRequirement } from '../services/jobPositions';
import { personnelService, type Competency, type Personnel } from '../services/personnel';
import { personnelComplianceService, type PersonnelAuthorization, type PersonnelSupervision } from '../services/personnelCompliance';
import { magnitudesService, type Magnitude } from '../services/magnitudes';
import { useAuth } from '../contexts/AuthContext';
import clsx from 'clsx';


export function ConfiguracionCargos() {
  const [activeTab, setActiveTab] = useState<'positions' | 'profiles' | 'education' | 'authorization' | 'supervision'>('positions');
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Personnel | null>(null);
  const [authorizations, setAuthorizations] = useState<PersonnelAuthorization[]>([]);
  const [supervisions, setSupervisions] = useState<PersonnelSupervision[]>([]);

  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<JobPosition | null>(null);
  
  const [profiles, setProfiles] = useState<JobProfile[]>([]);
  const [educationReqs, setEducationReqs] = useState<EducationRequirement[]>([]);
  
  const [magnitudes, setMagnitudes] = useState<Magnitude[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { profile } = useAuth();
  const isAdmin = profile?.role?.name === 'admin';

  // Competency Modal
  const [isCompetencyModalOpen, setIsCompetencyModalOpen] = useState(false);
  const [editingCompetency, setEditingCompetency] = useState<Competency | null>(null);
  const [newCompetency, setNewCompetency] = useState<Partial<Competency>>({ name: '', description: '', magnitude_id: null });

  // Position Modal
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<JobPosition | null>(null);
  const [newPosition, setNewPosition] = useState<Partial<JobPosition>>({ name: '', department: '', description: '', is_active: true });

  // Add Req Modal
  const [isEducationModalOpen, setIsEducationModalOpen] = useState(false);
  const [newEducationReq, setNewEducationReq] = useState<Partial<EducationRequirement>>({ req_type: 'degree', description: '', is_mandatory: true });

  // Authorization Modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [newAuth, setNewAuth] = useState<Partial<PersonnelAuthorization>>({ 
    authorized_activity: '', scope: '', authorized_by: '', authorization_date: '', is_active: true 
  });

  // Supervision Modal
  const [isSupervisionModalOpen, setIsSupervisionModalOpen] = useState(false);
  const [newSupervision, setNewSupervision] = useState<Partial<PersonnelSupervision>>({ 
    supervisor_name: '', activity_supervised: '', result: 'satisfactory', supervision_date: '' 
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [posData, compData, magData, perData] = await Promise.all([
        jobPositionsService.getJobPositions(),
        personnelService.getCompetencies(),
        magnitudesService.getAll(),
        personnelService.getPersonnel()
      ]);
      setPositions(posData);
      setCompetencies(compData);
      setMagnitudes(magData);
      setPersonnel(perData);
      
      if (posData.length > 0 && !selectedPosition) {
        setSelectedPosition(posData[0]);
      }
      if (perData.length > 0 && !selectedPerson) {
        setSelectedPerson(perData[0]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPosition, selectedPerson]);

  const fetchComplianceDetails = useCallback(async (personId: string) => {
    try {
      const [authData, supData] = await Promise.all([
        personnelComplianceService.getAuthorizations(personId),
        personnelComplianceService.getSupervisions(personId)
      ]);
      setAuthorizations(authData);
      setSupervisions(supData);
    } catch (error) {
      console.error('Error fetching compliance details:', error);
    }
  }, []);


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
  }, [selectedPosition, fetchPositionDetails]);

  useEffect(() => {
    if (selectedPerson) {
      fetchComplianceDetails(selectedPerson.id);
    }
  }, [selectedPerson, fetchComplianceDetails]);


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

  const handleSaveCompetency = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingCompetency) {
        await personnelService.updateCompetency(editingCompetency.id, newCompetency);
      } else {
        await personnelService.createCompetency(newCompetency);
      }
      setIsCompetencyModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving competency:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCompetency = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta competencia? Se eliminará de todos los perfiles.')) return;
    try {
      await personnelService.deleteCompetency(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting competency:', error);
    }
  };

  const handleSaveAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson) return;
    setIsSubmitting(true);
    try {
      await personnelComplianceService.createAuthorization({
        ...newAuth,
        personnel_id: selectedPerson.id
      });
      setIsAuthModalOpen(false);
      setNewAuth({ authorized_activity: '', scope: '', authorized_by: '', authorization_date: '', is_active: true });
      fetchComplianceDetails(selectedPerson.id);
    } catch (error) {
      console.error('Error saving authorization:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAuth = async (id: string) => {
    if (!confirm('¿Estás seguro de revocar esta autorización?')) return;
    try {
      await personnelComplianceService.deleteAuthorization(id);
      if (selectedPerson) fetchComplianceDetails(selectedPerson.id);
    } catch (error) {
      console.error('Error deleting auth:', error);
    }
  };

  const handleSaveSupervision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson) return;
    setIsSubmitting(true);
    try {
      await personnelComplianceService.createSupervision({
        ...newSupervision,
        personnel_id: selectedPerson.id
      });
      setIsSupervisionModalOpen(false);
      setNewSupervision({ supervisor_name: '', activity_supervised: '', result: 'satisfactory', supervision_date: '' });
      fetchComplianceDetails(selectedPerson.id);
    } catch (error) {
      console.error('Error saving supervision:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSupervision = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro de supervisión?')) return;
    try {
      await personnelComplianceService.deleteSupervision(id);
      if (selectedPerson) fetchComplianceDetails(selectedPerson.id);
    } catch (error) {
      console.error('Error deleting supervision:', error);
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
          { id: 'education', label: 'Requisitos Educativos', icon: GraduationCap },
          { id: 'authorization', label: 'Autorización del Personal', icon: ShieldCheck },
          { id: 'supervision', label: 'Supervisión del Personal', icon: Eye }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
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
          {/* Sidebar for selecting position (profiles/education) or person (auth/supervision) */}
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

          {(activeTab === 'authorization' || activeTab === 'supervision') && (
            <div className="lg:col-span-1 space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">Seleccionar Personal</h3>
              <div className="space-y-2">
                {personnel.map(per => (
                  <button
                    key={per.id}
                    onClick={() => setSelectedPerson(per)}
                    className={clsx(
                      "w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all border",
                      selectedPerson?.id === per.id 
                        ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200" 
                        : "bg-white text-slate-600 border-slate-100 hover:border-primary/30"
                    )}
                  >
                    <div className="block truncate">{per.name}</div>
                    <div className={clsx("text-[10px] mt-1 uppercase tracking-widest", selectedPerson?.id === per.id ? "text-slate-400" : "text-slate-400")}>
                      {per.role}
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
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary">
                      <Settings2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-800">Matriz de Competencias Requeridas</h2>
                      <p className="text-sm font-bold text-slate-400">Perfil: <span className="text-primary">{selectedPosition.name}</span></p>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button 
                      onClick={() => {
                        setEditingCompetency(null);
                        setNewCompetency({ name: '', description: '', magnitude_id: null });
                        setIsCompetencyModalOpen(true);
                      }}
                      className="rounded-[1.25rem] h-10 px-6 font-black bg-primary text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      GESTIONAR CATÁLOGO
                    </Button>
                  )}
                </div>
                <div className="p-6 space-y-6">
                  {competencies.length === 0 ? (
                    <div className="space-y-4">
                      <div className="p-12 text-center text-slate-400 font-bold bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                        No hay competencias definidas en el sistema.
                      </div>
                      {isAdmin && (
                        <div className="flex justify-center">
                          <Button 
                            onClick={() => {
                              setEditingCompetency(null);
                              setNewCompetency({ name: '', description: '', magnitude_id: null });
                              setIsCompetencyModalOpen(true);
                            }}
                            variant="outline"
                            className="rounded-2xl font-black"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            CREAR PRIMERA COMPETENCIA
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border border-slate-100 rounded-3xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Competencia</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nivel Requerido</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                            {isAdmin && <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>}
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
                                {isAdmin && (
                                  <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button 
                                        onClick={() => {
                                          setEditingCompetency(comp);
                                          setNewCompetency(comp);
                                          setIsCompetencyModalOpen(true);
                                        }}
                                        className="p-2 text-slate-400 hover:text-primary transition-colors"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteCompetency(comp.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                )}
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

            {/* AUTHORIZATION TAB */}
            {activeTab === 'authorization' && selectedPerson && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm">
                  <div>
                    <h2 className="text-xl font-black text-slate-800">Autorizaciones de Actividad</h2>
                    <p className="text-sm font-bold text-slate-400">Personal: <span className="text-primary font-black">{selectedPerson.name}</span></p>
                  </div>
                  <PermissionGuard module="config_cargos" action="create">
                    <Button 
                      onClick={() => setIsAuthModalOpen(true)}
                      className="rounded-[1rem] h-10 px-4 font-black bg-primary text-white hover:shadow-lg hover:shadow-primary/20 transition-all"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      OTORGAR AUTORIZACIÓN
                    </Button>
                  </PermissionGuard>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {authorizations.map(auth => (
                    <Card key={auth.id} className="border-none shadow-sm rounded-2xl bg-white p-5 flex items-center justify-between border-l-4 border-l-green-500">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              Actividad Autorizada
                            </span>
                            {auth.is_active ? (
                              new Date(auth.expiry_date || '2099-12-31') < new Date() ? (
                                <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-500 text-[9px] font-bold uppercase tracking-wider">Vencida</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-green-50 text-green-500 text-[9px] font-bold uppercase tracking-wider">Vigente</span>
                              )
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-wider">Revocada</span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-slate-700">{auth.authorized_activity}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                            <p className="text-[10px] text-slate-400 font-bold">Autorizado por: <span className="text-slate-600 uppercase">{auth.authorized_by}</span></p>
                            <p className="text-[10px] text-slate-400 font-bold">Desde: <span className="text-slate-600">{auth.authorization_date}</span></p>
                            {auth.expiry_date && <p className="text-[10px] text-slate-400 font-bold">Vence: <span className={clsx(new Date(auth.expiry_date) < new Date() ? "text-red-500" : "text-slate-600")}>{auth.expiry_date}</span></p>}
                          </div>
                          {auth.scope && <p className="text-xs text-slate-500 mt-2 italic bg-slate-50 p-2 rounded-xl">Alcance: {auth.scope}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {auth.document_url && (
                          <a href={auth.document_url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-primary transition-colors">
                            <FileText className="w-4 h-4" />
                          </a>
                        )}
                        <PermissionGuard module="config_cargos" action="delete">
                          <button onClick={() => handleDeleteAuth(auth.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </PermissionGuard>
                      </div>
                    </Card>
                  ))}
                  {authorizations.length === 0 && (
                    <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mx-auto mb-4">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <p className="text-slate-400 font-bold text-sm">No hay autorizaciones registradas para este integrante.</p>
                      <p className="text-slate-300 text-xs mt-1">Haga clic en el botón superior para otorgar una nueva autorización según 6.2.5 e).</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUPERVISION TAB */}
            {activeTab === 'supervision' && selectedPerson && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm">
                  <div>
                    <h2 className="text-xl font-black text-slate-800">Registros de Supervisión</h2>
                    <p className="text-sm font-bold text-slate-400">Personal: <span className="text-primary font-black">{selectedPerson.name}</span></p>
                  </div>
                  <div className="flex gap-3">
                    <PermissionGuard module="config_cargos" action="create">
                      <Button 
                        onClick={() => setIsSupervisionModalOpen(true)}
                        className="rounded-[1rem] h-10 px-4 font-black bg-slate-900 text-white hover:bg-black transition-all"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        REGISTRAR SUPERVISIÓN
                      </Button>
                    </PermissionGuard>
                  </div>
                </div>

                {/* Supervision Summary Strip */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="border-none shadow-sm rounded-2xl bg-white p-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Supervisiones</p>
                    <p className="text-2xl font-black text-slate-800">{supervisions.length}</p>
                  </Card>
                  <Card className="border-none shadow-sm rounded-2xl bg-white p-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Última Fecha</p>
                    <p className="text-xl font-black text-slate-800">
                      {supervisions.length > 0 ? supervisions[0].supervision_date : 'N/A'}
                    </p>
                  </Card>
                  <Card className="border-none shadow-sm rounded-2xl bg-white p-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Resultado Promedio</p>
                    <p className={clsx(
                      "text-xl font-black",
                      supervisions.filter(s => s.result === 'satisfactory').length / supervisions.length > 0.8 ? "text-green-600" : "text-orange-600"
                    )}>
                      {supervisions.length > 0 
                        ? `${Math.round((supervisions.filter(s => s.result === 'satisfactory').length / supervisions.length) * 100)}% Sat.`
                        : 'N/A'}
                    </p>
                  </Card>
                  <Card className="border-none shadow-sm rounded-2xl bg-white p-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Siguiente Prog.</p>
                    <p className="text-xl font-black text-blue-600">
                      {supervisions.find(s => s.next_supervision_date)?.next_supervision_date || 'No prog.'}
                    </p>
                  </Card>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {supervisions.map(sup => (
                    <Card key={sup.id} className={clsx(
                      "border-none shadow-sm rounded-2xl bg-white p-5 flex items-center justify-between border-l-4",
                      sup.result === 'satisfactory' ? "border-l-green-500" : sup.result === 'needs_improvement' ? "border-l-orange-500" : "border-l-red-500"
                    )}>
                      <div className="flex items-center gap-4">
                        <div className={clsx(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          sup.result === 'satisfactory' ? "bg-green-50 text-green-600" : sup.result === 'needs_improvement' ? "bg-orange-50 text-orange-600" : "bg-red-50 text-red-600"
                        )}>
                          <Eye className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {sup.supervision_date}
                            </span>
                            <span className={clsx(
                              "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider",
                              sup.result === 'satisfactory' ? "bg-green-50 text-green-500" : sup.result === 'needs_improvement' ? "bg-orange-50 text-orange-500" : "bg-red-50 text-red-500"
                            )}>
                              {sup.result === 'satisfactory' ? 'Satisfactorio' : sup.result === 'needs_improvement' ? 'Mejora Necesaria' : 'No Satisfactorio'}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-slate-700">{sup.activity_supervised}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                            <p className="text-[10px] text-slate-400 font-bold">Supervisor: <span className="text-slate-600 uppercase">{sup.supervisor_name}</span></p>
                            {sup.next_supervision_date && <p className="text-[10px] text-blue-500 font-black tracking-tight">Prox. Prog: {sup.next_supervision_date}</p>}
                          </div>
                          {sup.observations && <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg italic font-medium border-l-2 border-slate-200">"{sup.observations}"</p>}
                          {sup.corrective_action && (
                            <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-100">
                              <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Plan de Mejora / Acción Correctiva:</p>
                              <p className="text-xs font-bold text-red-700">{sup.corrective_action}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {sup.document_url && (
                          <a href={sup.document_url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-primary transition-colors">
                            <FileText className="w-4 h-4" />
                          </a>
                        )}
                        <PermissionGuard module="config_cargos" action="delete">
                          <button onClick={() => handleDeleteSupervision(sup.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </PermissionGuard>
                      </div>
                    </Card>
                  ))}
                  {supervisions.length === 0 && (
                    <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mx-auto mb-4">
                        <Eye className="w-6 h-6" />
                      </div>
                      <p className="text-slate-400 font-bold text-sm">No hay registros de supervisión para este integrante.</p>
                      <p className="text-slate-300 text-xs mt-1">Cumpla con el requisito 6.2.5 d) registrando la supervisión de actividades técnicas.</p>
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

      {/* Competency Modal */}
      <Modal isOpen={isCompetencyModalOpen} onClose={() => setIsCompetencyModalOpen(false)} title={editingCompetency ? "Editar Competencia" : "Nueva Competencia"}>
        <form onSubmit={handleSaveCompetency} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nombre de la Competencia</label>
            <input required className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" value={newCompetency.name || ''} onChange={(e) => setNewCompetency({...newCompetency, name: e.target.value})} placeholder="Ej: Calibración de Masa" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Magnitud Relacionada (Opcional)</label>
            <select className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" value={newCompetency.magnitude_id || ''} onChange={(e) => setNewCompetency({...newCompetency, magnitude_id: e.target.value || null})}>
              <option value="">General / Ninguna</option>
              {magnitudes.map(mag => (
                <option key={mag.id} value={mag.id}>{mag.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Descripción</label>
            <textarea className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 h-24 resize-none" value={newCompetency.description || ''} onChange={(e) => setNewCompetency({...newCompetency, description: e.target.value})} placeholder="Detalles de la competencia..." />
          </div>
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" onClick={() => setIsCompetencyModalOpen(false)} className="flex-1 rounded-2xl font-black">CANCELAR</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 rounded-2xl font-black bg-primary text-white">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              {editingCompetency ? 'ACTUALIZAR' : 'CREAR'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Authorization Modal */}
      <Modal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} title="Otorga Nueva Autorización">
        <form onSubmit={handleSaveAuth} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Actividad a Autorizar</label>
            <select 
              required 
              className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" 
              value={newAuth.authorized_activity || ''} 
              onChange={(e) => setNewAuth({...newAuth, authorized_activity: e.target.value})}
            >
              <option value="">-- Seleccionar Competencia --</option>
              {competencies.map(comp => (
                <option key={comp.id} value={comp.name}>{comp.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Alcance de la Autorización</label>
            <textarea className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 h-20 resize-none" value={newAuth.scope || ''} onChange={(e) => setNewAuth({...newAuth, scope: e.target.value})} placeholder="Ej: Rango de 0 a 200g, Clase II y III..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Responsable que Autoriza</label>
              <input required className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" value={newAuth.authorized_by || ''} onChange={(e) => setNewAuth({...newAuth, authorized_by: e.target.value})} placeholder="Nombre del Director" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Fecha de Autorización</label>
              <input type="date" required className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" value={newAuth.authorization_date || ''} onChange={(e) => setNewAuth({...newAuth, authorization_date: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Fecha de Vencimiento (Opcional)</label>
              <input type="date" className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" value={newAuth.expiry_date || ''} onChange={(e) => setNewAuth({...newAuth, expiry_date: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Sustento (PDF)</label>
              <input type="file" accept=".pdf" className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-primary/10 file:text-primary hover:file:bg-primary/20" 
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file && selectedPerson) {
                    const url = await personnelComplianceService.uploadComplianceDocument(selectedPerson.id, file, 'auth');
                    setNewAuth({...newAuth, document_url: url});
                  }
                }}
              />
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" onClick={() => setIsAuthModalOpen(false)} className="flex-1 rounded-2xl font-black">CANCELAR</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 rounded-2xl font-black bg-primary text-white">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              GUARDAR ACTA
            </Button>
          </div>
        </form>
      </Modal>

      {/* Supervision Modal */}
      <Modal isOpen={isSupervisionModalOpen} onClose={() => setIsSupervisionModalOpen(false)} title="Registrar Supervisión del Personal">
        <form onSubmit={handleSaveSupervision} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Actividad Supervisada</label>
            <select 
              required 
              className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" 
              value={newSupervision.activity_supervised || ''} 
              onChange={(e) => setNewSupervision({...newSupervision, activity_supervised: e.target.value})}
            >
              <option value="">-- Seleccionar Competencia --</option>
              {competencies.map(comp => (
                <option key={comp.id} value={comp.name}>{comp.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Supervisor</label>
              <input required className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" value={newSupervision.supervisor_name || ''} onChange={(e) => setNewSupervision({...newSupervision, supervisor_name: e.target.value})} placeholder="Nombre del Supervisor" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Fecha de Supervisión</label>
              <input type="date" required className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" value={newSupervision.supervision_date || ''} onChange={(e) => setNewSupervision({...newSupervision, supervision_date: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Próxima Supervisión (Opcional)</label>
              <input type="date" className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20" value={newSupervision.next_supervision_date || ''} onChange={(e) => setNewSupervision({...newSupervision, next_supervision_date: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Evidencia (Opcional)</label>
              <input type="file" accept=".pdf" className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-slate-100 file:text-slate-600 hover:file:bg-slate-200" 
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file && selectedPerson) {
                    const url = await personnelComplianceService.uploadComplianceDocument(selectedPerson.id, file, 'supervision');
                    setNewSupervision({...newSupervision, document_url: url});
                  }
                }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Resultado de la Supervisión</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'satisfactory', label: 'Satisfactorio', color: 'bg-green-50 text-green-600 border-green-200' },
                { id: 'needs_improvement', label: 'Mejora Necesaria', color: 'bg-orange-50 text-orange-600 border-orange-200' },
                { id: 'unsatisfactory', label: 'No Satisfactorio', color: 'bg-red-50 text-red-600 border-red-200' }
              ].map(res => (
                <button
                  key={res.id}
                  type="button"
                  onClick={() => setNewSupervision({...newSupervision, result: res.id as any})}
                  className={clsx(
                    "py-3 px-2 rounded-xl border text-[10px] font-black uppercase transition-all",
                    newSupervision.result === res.id ? res.color : "bg-white text-slate-400 border-slate-100"
                  )}
                >
                  {res.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Observaciones</label>
            <textarea className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 h-24 resize-none" value={newSupervision.observations || ''} onChange={(e) => setNewSupervision({...newSupervision, observations: e.target.value})} placeholder="Detalles de lo observado..." />
          </div>
          {newSupervision.result !== 'satisfactory' && (
            <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
              <label className="text-[10px] font-black text-red-500 uppercase tracking-widest pl-1">Plan de Mejora / Acción Correctiva</label>
              <textarea required className="w-full bg-red-50/50 border border-red-100 rounded-2xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-red-200 h-20 resize-none" value={newSupervision.corrective_action || ''} onChange={(e) => setNewSupervision({...newSupervision, corrective_action: e.target.value})} placeholder="Defina las acciones para cerrar la brecha de competencia..." />
            </div>
          )}
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" onClick={() => setIsSupervisionModalOpen(false)} className="flex-1 rounded-2xl font-black">CANCELAR</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 rounded-2xl font-black bg-slate-900 text-white">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              REGISTRAR
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}

