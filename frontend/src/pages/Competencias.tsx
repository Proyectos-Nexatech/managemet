import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Users, 
  CheckCircle2, 
  ShieldCheck, 
  UserPlus, 
  History, 
  Loader2, 
  MoreVertical,
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { personnelService, type Personnel, type Competency, type PersonnelCompetency } from '../services/personnel';
import { jobPositionsService, type JobPosition, type JobProfile } from '../services/jobPositions';
import { magnitudesService, type Magnitude } from '../services/magnitudes';
import { Modal } from '../components/ui/Modal';
import clsx from 'clsx';

const levelMap = {
  'basic': { label: 'Básico', color: 'text-slate-500 bg-slate-50 border-slate-100', progress: 30 },
  'intermediate': { label: 'Intermedio', color: 'text-blue-500 bg-blue-50 border-blue-100', progress: 65 },
  'expert': { label: 'Experto', color: 'text-primary bg-primary/5 border-primary/10', progress: 100 },
};

export function Competencias() {
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [magnitudes, setMagnitudes] = useState<Magnitude[]>([]);
  const [allPcData, setAllPcData] = useState<PersonnelCompetency[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Personnel | null>(null);
  const [personCompetencies, setPersonCompetencies] = useState<PersonnelCompetency[]>([]);
  const [selectedPersonProfiles, setSelectedPersonProfiles] = useState<JobProfile[]>([]);
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newPerson, setNewPerson] = useState<Partial<Personnel>>({ 
    name: '', role: '', area: '', status: 'active', job_position_id: null
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pData, cData, mData, pcData, jpData] = await Promise.all([
        personnelService.getPersonnel(),
        personnelService.getCompetencies(),
        magnitudesService.getAll(),
        personnelService.getAllPersonnelCompetencies(),
        jobPositionsService.getJobPositions()
      ]);
      setPersonnelList(pData);
      setCompetencies(cData);
      setMagnitudes(mData);
      setAllPcData(pcData);
      setJobPositions(jpData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(() => {
    if (competencies.length === 0) return { avg: 0, authorizedCount: 0, expertCount: 0 };
    
    // Calculate authorized count (unique people with at least one auth)
    const authorizedPeople = new Set(allPcData.filter(pc => pc.is_authorized).map(pc => pc.personnel_id));
    
    // Calculate experts (unique people with at least one expert level auth)
    const expertPeople = new Set(allPcData.filter(pc => pc.is_authorized && pc.level === 'expert').map(pc => pc.personnel_id));
    
    // Average progress across all active personnel
    const percentages = personnelList.map(p => {
       const pAuthCount = allPcData.filter(pc => pc.personnel_id === p.id && pc.is_authorized).length;
       return (pAuthCount / competencies.length) * 100;
    });
    const avg = percentages.length > 0 ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length) : 0;

    return {
      avg,
      authorizedCount: authorizedPeople.size,
      expertCount: expertPeople.size
    };
  }, [allPcData, competencies, personnelList]);

  const handleOpenAuth = async (person: Personnel) => {
    setSelectedPerson(person);
    setLoading(true);
    try {
      const pc = await personnelService.getPersonnelCompetencies(person.id);
      setPersonCompetencies(pc);
      
      let profiles: JobProfile[] = [];
      if (person.job_position_id) {
        profiles = await jobPositionsService.getJobProfiles(person.job_position_id);
      }
      setSelectedPersonProfiles(profiles);

      setIsAuthModalOpen(true);
    } catch (error) {
      console.error('Error fetching pc:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await personnelService.createPersonnel(newPerson);
      setIsPersonnelModalOpen(false);
      setNewPerson({ name: '', role: '', area: '', status: 'active', job_position_id: null });
      fetchData();
    } catch (error) {
      console.error('Error creating personnel:', error);
      alert('Error registrando al personal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAuth = async (competencyId: string, currentStatus: boolean) => {
    if (!selectedPerson) return;
    try {
      await personnelService.updatePersonnelCompetency(selectedPerson.id, competencyId, {
        is_authorized: !currentStatus,
        authorization_date: new Date().toISOString()
      });
      // Refresh pc data
      const pc = await personnelService.getPersonnelCompetencies(selectedPerson.id);
      setPersonCompetencies(pc);
      // Refresh global stats
      fetchData();
    } catch (error) {
      console.error('Error updating auth:', error);
    }
  };

  const filteredPersonnel = personnelList.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-800">Capa de Competencias (ISO 17025)</h1>
          <p className="text-xs font-bold text-slate-400">Demuestra que el personal es competente, capacitado y autorizado para tareas específicas.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 shadow-sm" />
            <input 
              type="text" 
              placeholder="Buscar personal..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-[1.25rem] py-3.5 pl-11 pr-4 text-[11px] font-black outline-none focus:ring-4 focus:ring-primary/5 transition-all shadow-sm"
            />
          </div>
          <Button 
            onClick={() => setIsPersonnelModalOpen(true)}
            className="rounded-[1.25rem] h-13 px-8 font-black flex items-center gap-3 shadow-xl shadow-primary/20 bg-primary border-none transition-all hover:scale-[1.03] active:scale-95 text-white"
          >
            <UserPlus className="w-5 h-5 stroke-[3px]" />
            REGISTRAR PERSONAL
          </Button>
        </div>
      </div>

      {/* Analytics Brief */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <Card className="rounded-[2.5rem] border-none bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-3">
               <div className="p-3.5 bg-blue-50 rounded-2xl">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
               </div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Promedio Competencia</span>
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-3xl font-black text-slate-800 tracking-tighter">{stats.avg}%</span>
               <span className="text-[10px] font-black text-green-500 tracking-wide leading-none">Real</span>
            </div>
         </Card>
         <Card className="rounded-[2.5rem] border-none bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-3">
               <div className="p-3.5 bg-green-50 rounded-2xl">
                  <ShieldCheck className="w-5 h-5 text-green-500" />
               </div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Autorizados</span>
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-3xl font-black text-slate-800 tracking-tighter">{stats.authorizedCount}</span>
               <span className="text-[10px] font-black text-slate-400 tracking-wide leading-none">Personas</span>
            </div>
         </Card>
         <Card className="rounded-[2.5rem] border-none bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-3">
               <div className="p-3.5 bg-orange-50 rounded-2xl">
                  <History className="w-5 h-5 text-orange-500" />
               </div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Vencimientos Próximos</span>
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-3xl font-black text-slate-800 tracking-tighter">0</span>
               <span className="text-[10px] font-black text-orange-500 tracking-wide leading-none">en 30 días</span>
            </div>
         </Card>
         <Card className="rounded-[2.5rem] border-none bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-3">
               <div className="p-3.5 bg-primary/5 rounded-2xl">
                  <Award className="w-5 h-5 text-primary" />
               </div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Expertos</span>
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-3xl font-black text-slate-800 tracking-tighter">{stats.expertCount}</span>
               <span className="text-[10px] font-black text-slate-400 tracking-wide leading-none">Sénior</span>
            </div>
         </Card>
      </div>

      {/* Main Grid: Personnel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading && personnelList.length === 0 ? (
          [1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-slate-100/50 rounded-[3rem] animate-pulse" />)
        ) : filteredPersonnel.map((person: Personnel) => {
          const authCount = allPcData.filter(pc => pc.personnel_id === person.id && pc.is_authorized).length;
          const percentage = competencies.length > 0 ? Math.round((authCount / competencies.length) * 100) : 0;

          return (
            <Card key={person.id} className="border-none shadow-[0_12px_45px_-12px_rgba(0,0,0,0.05)] rounded-[3rem] bg-white group hover:scale-[1.02] hover:shadow-[0_45px_100px_-20px_rgba(0,0,0,0.08)] transition-all duration-500 overflow-hidden border border-white hover:border-slate-100 flex flex-col p-8">
              <div className="flex justify-between items-start mb-6">
                 <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-300 transition-colors group-hover:bg-primary group-hover:text-white">
                       <Users className="w-7 h-7" />
                    </div>
                    <div className="flex flex-col">
                       <h3 className="text-lg font-black text-slate-800 group-hover:text-primary transition-colors leading-tight">{person.name}</h3>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">{person.role}</span>
                    </div>
                 </div>
                 <button className="p-2.5 text-slate-300 hover:text-slate-800 hover:bg-slate-50 rounded-xl active:scale-90 transition-all">
                    <MoreVertical className="w-5 h-5" />
                 </button>
              </div>

              <div className="flex-1 space-y-4 mb-8">
                 <div className="flex flex-col gap-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:shadow-sm transition-all duration-500">
                    <div className="flex items-center justify-between mb-1">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Capacitación</span>
                       <span className="text-[10px] font-black text-primary">{percentage}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                       <div className="h-full bg-primary transition-all duration-700" style={{ width: `${percentage}%` }}></div>
                    </div>
                 </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                 <div className="flex items-center gap-2">
                   {person.status === 'active' ? (
                     <span className="flex items-center gap-1.5 text-[9px] font-black text-green-500 uppercase tracking-widest bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Activo
                     </span>
                   ) : (
                     <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-xl">
                        Inactivo
                     </span>
                   )}
                 </div>
                 <button 
                   onClick={() => handleOpenAuth(person)}
                   className="flex items-center gap-2 text-[10px] font-black text-primary hover:gap-4 transition-all hover:text-slate-800 group/btn"
                 >
                   MATRIZ TÉCNICA 
                   <div className="p-1.5 bg-primary/5 rounded-lg group-hover/btn:bg-primary/10">
                     <ChevronRight className="w-4 h-4" />
                  </div>
                 </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* MODAL: REGISTRAR PERSONAL */}
      <Modal isOpen={isPersonnelModalOpen} onClose={() => setIsPersonnelModalOpen(false)} title="Nuevo Técnico / Personal">
        <form onSubmit={handleAddPerson} className="space-y-6">
           <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nombre Completo</label>
             <input required placeholder="ej: Ing. Ricardo Pérez" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none" value={newPerson.name} onChange={(e) => setNewPerson({ ...newPerson, name: e.target.value })} />
           </div>
           <div className="grid grid-cols-1 gap-6">
             <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Cargo Técnico</label>
               <select 
                 required
                 className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none appearance-none" 
                 value={newPerson.job_position_id || ''} 
                 onChange={(e) => {
                   const pos = jobPositions.find(p => p.id === e.target.value);
                   setNewPerson({ 
                     ...newPerson, 
                     job_position_id: pos?.id || null,
                     role: pos?.name || '',
                     area: pos?.department || ''
                   });
                 }}
               >
                 <option value="" disabled>-- Seleccionar Cargo --</option>
                 {jobPositions.map(pos => (
                   <option key={pos.id} value={pos.id}>{pos.name} ({pos.department})</option>
                 ))}
               </select>
             </div>
           </div>
           <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsPersonnelModalOpen(false)} className="flex-1 h-13 rounded-2xl font-black border-slate-200">CANCELAR</Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 h-13 rounded-2xl font-black bg-primary text-white shadow-xl shadow-primary/20 gap-3">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                GUARDAR REGISTRO
              </Button>
           </div>
        </form>
      </Modal>

      {/* MODAL: MATRIZ DE AUTORIZACIÓN (ISO 17025) */}
      <Modal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} title={`Matriz Técnica: ${selectedPerson?.name}`} maxWidthClass="max-w-4xl">
         <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-4 custom-scrollbar">
            <p className="text-xs font-bold text-slate-400 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
               <ShieldCheck className="w-4 h-4 inline-block mr-2 text-primary" />
               Define las autorizaciones específicas para cada magnitud metrológica.
            </p>

            <div className="space-y-4">
               {competencies.length === 0 ? (
                 <p className="text-center py-8 text-xs font-black text-slate-300 uppercase tracking-widest leading-loose">No hay competencias definidas en el catálogo <br/> vinculadas a magnitudes.</p>
               ) : competencies.map((comp: Competency) => {
                 const pc = personCompetencies.find(x => x.competency_id === comp.id);
                 const levelInfo = pc ? (levelMap[pc.level as keyof typeof levelMap] || levelMap.basic) : levelMap.basic;
                 
                 const profile = selectedPersonProfiles.find(p => p.competency_id === comp.id);
                 const hasBrecha = profile && profile.is_mandatory && (!pc || !pc.is_authorized);
                 
                 return (
                   <Card key={comp.id} className={clsx("p-6 rounded-[2rem] border transition-all shadow-sm", hasBrecha ? "border-red-100 bg-red-50/20" : "border-slate-50 bg-white hover:border-slate-100")}>
                      <div className="flex items-center justify-between gap-6">
                         <div className="flex items-center gap-5 flex-1">
                            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex flex-col items-center justify-center border border-slate-100">
                               <span className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1">Magnitud</span>
                               <span className="text-[11px] font-black text-slate-800 leading-none">{comp.magnitude?.name || 'GEN'}</span>
                            </div>
                            <div className="flex flex-col">
                               <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                 {comp.name}
                                 {hasBrecha && <span className="px-2 py-0.5 rounded bg-red-100 text-red-600 text-[9px] font-black uppercase tracking-widest">Brecha</span>}
                               </h4>
                               <p className="text-[10px] font-bold text-slate-400 line-clamp-1">{comp.description || 'Sin descripción técnica'}</p>
                            </div>
                         </div>

                         <div className="flex items-center gap-8">
                            {/* Level Visualizer */}
                            <div className="flex flex-col items-end gap-1.5 w-32">
                               <span className={clsx("text-[9px] font-black uppercase tracking-widest leading-none px-2 py-1 rounded-lg", levelInfo.color)}>
                                 {levelInfo.label}
                               </span>
                               <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-primary transition-all duration-700" style={{ width: `${levelInfo.progress}%` }}></div>
                               </div>
                            </div>
                            
                            {/* Toggle Auth */}
                            <div className="flex items-center gap-3">
                               <div className="h-8 w-px bg-slate-100" />
                               <Button 
                                 onClick={() => handleToggleAuth(comp.id, pc?.is_authorized || false)}
                                 variant={pc?.is_authorized ? "default" : "outline"}
                                 className={clsx(
                                   "rounded-xl h-10 px-4 font-black text-[10px] tracking-widest gap-2 transition-all active:scale-95",
                                   pc?.is_authorized ? "bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-200" : "border-slate-100 text-slate-400"
                                 )}
                               >
                                 {pc?.is_authorized ? <ShieldCheck className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4 opacity-30" />}
                                 {pc?.is_authorized ? 'AUTORIZADO' : 'NO AUTORIZADO'}
                               </Button>
                            </div>
                         </div>
                      </div>
                   </Card>
                 );
               })}
            </div>

            {/* SEED FOR DEMO if empty competencies */}
            {competencies.length === 0 && (
              <div className="flex justify-center pt-4">
                 <Button 
                   variant="outline" 
                   onClick={async () => {
                     const seed = magnitudes.map(m => ({
                       name: `Calibración de ${m.name}`,
                       description: `Habilidad para ejecutar el método de calibración en la magnitud ${m.name}.`,
                       magnitude_id: m.id
                     }));
                     for (const c of seed) {
                       await personnelService.createCompetency(c);
                     }
                     fetchData();
                   }}
                   className="rounded-xl font-bold border-slate-200 uppercase text-[9px] tracking-widest"
                 >
                   AUTOGENERAR COMPETENCIAS BASE
                 </Button>
              </div>
            )}

            <div className="pt-8 border-t border-slate-50">
               <Button onClick={() => setIsAuthModalOpen(false)} className="w-full h-13 rounded-2xl font-black bg-slate-900 border-none shadow-xl shadow-slate-200 text-white tracking-widest text-[10px]">
                  CERRAR MATRIZ TÉCNICA
               </Button>
            </div>
         </div>
      </Modal>
    </div>
  );
}
