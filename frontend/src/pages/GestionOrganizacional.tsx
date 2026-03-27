import { useState, useEffect } from 'react';
import { 
  GitGraph, 
  Network, 
  ShieldAlert, 
  Plus, 
  Save, 
  Loader2,
  UserCog,
  ShieldCheck,
  AlertTriangle,
  Blocks,
  Info,
  ListChecks,
  BookOpen,
  Edit2,
  Trash2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { 
  organizationService, 
  type Process, 
  type ImpartialityRisk, 
  type OrgNode 
} from '../services/organization';
import { jobPositionsService, type JobPosition } from '../services/jobPositions';
import clsx from 'clsx';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

export function GestionOrganizacional() {
  const [activeTab, setActiveTab] = useState<'structure' | 'processes' | 'impartiality' | 'help'>('structure');
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const isAdmin = profile?.role?.name === 'admin';
  
  // Data States
  const [nodes, setNodes] = useState<OrgNode[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [risks, setRisks] = useState<ImpartialityRisk[]>([]);
  const [positions, setPositions] = useState<JobPosition[]>([]);

  // Modal States
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);

  const [newRisk, setNewRisk] = useState<Partial<ImpartialityRisk>>({ 
    risk_description: '', 
    risk_level: 'Bajo', 
    status: 'Identificado',
    mitigation_actions: ''
  });
  const [newProcess, setNewProcess] = useState<Partial<Process>>({
    name: '',
    type: 'Operativo',
    description: ''
  });
  const [newNode, setNewNode] = useState<Partial<OrgNode>>({
    job_position_id: '',
    parent_node_id: null,
    authority_level: 1,
    is_key_personnel: false
  });
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []); // Only once at mount to optimize loading

  const fetchData = async () => {
    try {
      setLoading(true);
      const [nodesData, procData, risksData, posData] = await Promise.all([
        organizationService.getOrgNodes(),
        organizationService.getProcesses(),
        organizationService.getImpartialityRisks(),
        jobPositionsService.getJobPositions()
      ]);
      setNodes(nodesData);
      setProcesses(procData);
      setRisks(risksData);
      setPositions(posData);
    } catch (error) {
      console.error('Error fetching organization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await organizationService.createProcess(newProcess);
      setIsProcessModalOpen(false);
      setNewProcess({ name: '', type: 'Operativo', description: '' });
      fetchData();
    } catch (error) {
      console.error('Error saving process:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let parentNodeId = newNode.parent_node_id;

      // Logic to resolve parent_node_id if a position_id was selected instead of a node_id
      if (newNode.parent_node_id && !nodes.some(n => n.id === newNode.parent_node_id)) {
        // If the selected parent ID is actually a position_id, find or create its node
        const existingParentNode = nodes.find(n => n.job_position_id === newNode.parent_node_id);
        if (existingParentNode) {
          parentNodeId = existingParentNode.id;
        } else {
          // Create a root-level node for that position first
          const createdParent = await organizationService.upsertOrgNode({
            job_position_id: newNode.parent_node_id,
            authority_level: 10, // Higher default for parents
            is_key_personnel: true
          });
          parentNodeId = createdParent.id;
        }
      }

      const nodeData = { ...newNode, parent_node_id: parentNodeId };
      
      if (editingNodeId) {
        await organizationService.updateOrgNode(editingNodeId, nodeData);
      } else {
        const exists = nodes.find(n => n.job_position_id === newNode.job_position_id);
        if (exists) {
          await organizationService.updateOrgNode(exists.id, nodeData);
        } else {
          await organizationService.upsertOrgNode(nodeData);
        }
      }
      
      setIsNodeModalOpen(false);
      setEditingNodeId(null);
      setNewNode({ job_position_id: '', parent_node_id: null, authority_level: 1, is_key_personnel: false });
      fetchData();
    } catch (error) {
      console.error('Error saving node:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditNode = (node: OrgNode) => {
    setNewNode({
      job_position_id: node.job_position_id,
      parent_node_id: node.parent_node_id,
      authority_level: node.authority_level,
      is_key_personnel: node.is_key_personnel
    });
    setEditingNodeId(node.id);
    setIsNodeModalOpen(true);
  };

  const handleDeleteNode = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este nivel jerárquico?')) return;
    try {
      await organizationService.deleteOrgNode(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting node:', error);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!isAdmin) return;
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = nodes.findIndex(n => n.id === active.id);
      const newIndex = nodes.findIndex(n => n.id === over?.id);
      
      const newNodes = arrayMove(nodes, oldIndex, newIndex);
      setNodes(newNodes);

      // Re-calculate authority levels based on new order (1 to 10)
      try {
        await Promise.all(
          newNodes.map((node, index) => {
            const newLevel = Math.min(index + 1, 10);
            if (node.authority_level !== newLevel) {
              return organizationService.updateOrgNode(node.id, { authority_level: newLevel });
            }
            return Promise.resolve();
          })
        );
      } catch (error) {
        console.error('Error updating sequence:', error);
      }
    }
  };

  const handleSaveRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await organizationService.createImpartialityRisk(newRisk);
      setIsRiskModalOpen(false);
      setNewRisk({ risk_description: '', risk_level: 'Bajo', status: 'Identificado' });
      fetchData();
    } catch (error) {
      console.error('Error saving risk:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800">Estructura y Gestión</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">
            Cumplimiento normativo ISO 17025: Numerales 4.1 (Imparcialidad), 4.2 (Confidencialidad) y 5 (Estructura)
          </p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        {[
          { id: 'structure', label: 'Estructura Jerárquica', icon: GitGraph },
          { id: 'processes', label: 'Mapa de Procesos', icon: Network },
          { id: 'impartiality', label: 'Imparcialidad y Riesgos', icon: ShieldAlert },
          { id: 'help', label: 'Guía de Configuración', icon: Info }
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
        <div className="flex items-center justify-center p-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          
           {/* TAB: ESTRUCTURA (Numeral 5) */}
           {activeTab === 'structure' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-8 rounded-[2.5rem] bg-white border-none shadow-sm h-fit">
                   <div className="flex items-center justify-between mb-8">
                     <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shadow-sm">
                         <UserCog className="w-6 h-6" />
                       </div>
                       <div>
                         <h3 className="text-xl font-black text-slate-800">Estructura de Autoridad</h3>
                         <p className="text-xs font-bold text-slate-400">Arraste para jerarquizar (1-10)</p>
                       </div>
                     </div>
                     <Button onClick={() => setIsNodeModalOpen(true)} className="rounded-xl h-10 px-4 font-black bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all">
                       <Plus className="w-4 h-4 mr-2" />
                       AÑADIR NIVEL
                     </Button>
                   </div>
                   
                   <div className="space-y-2">
                     {nodes.length === 0 ? (
                       <div className="p-12 text-center text-slate-300 border-2 border-dashed border-slate-50 rounded-[2rem] font-bold">
                          No se ha configurado la jerarquía visual.
                       </div>
                     ) : (
                       <DndContext 
                         sensors={sensors} 
                         collisionDetection={closestCenter} 
                         onDragEnd={handleDragEnd}
                       >
                         <SortableContext items={nodes.map(n => n.id)} strategy={verticalListSortingStrategy}>
                           <div className="space-y-3">
                             {nodes.sort((a,b) => a.authority_level - b.authority_level).map(node => (
                               <SortableNode 
                                 key={node.id} 
                                 node={node} 
                                 isAdmin={isAdmin}
                                 onEdit={handleEditNode}
                                 onDelete={handleDeleteNode}
                               />
                             ))}
                           </div>
                         </SortableContext>
                       </DndContext>
                     )}
                   </div>
                </Card>
                
                {/* Visual Pyramid Visualization */}
                <div className="space-y-6">
                  <Card className="p-10 rounded-[2.5rem] bg-slate-900 border-none shadow-2xl text-white overflow-hidden relative min-h-[500px] flex flex-col justify-center">
                    <div className="relative z-10 text-center mb-8">
                       <h3 className="text-2xl font-black mb-2 tracking-tight">Pirámide Organizacional</h3>
                       <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest bg-white/5 inline-block px-3 py-1 rounded-full border border-white/10">Vista de Distribución de Mando</p>
                    </div>

                    <div className="relative flex flex-col items-center gap-2">
                       {(() => {
                          const levelGroups = nodes.reduce((acc, node) => {
                             const l = node.authority_level;
                             if (!acc[l]) acc[l] = [];
                             acc[l].push(node);
                             return acc;
                          }, {} as Record<number, OrgNode[]>);

                          const sortedLevels = Object.keys(levelGroups).map(Number).sort((a,b) => a - b);
                          
                          return sortedLevels.map((level, i) => {
                             const levelNodes = levelGroups[level];
                             // Pyramid shape: narrow at top (Level 1), wide at bottom
                             const rowWidth = 30 + (i * (70 / Math.max(sortedLevels.length - 1, 1)));
                             
                             return (
                                <div key={level} className="flex items-center justify-center gap-2 w-full">
                                   <div className="flex gap-2 justify-center" style={{ width: `${rowWidth}%` }}>
                                      {levelNodes.map(node => (
                                         <div 
                                           key={node.id}
                                           className={clsx(
                                             "relative h-12 flex-1 flex items-center justify-center transition-all duration-700 hover:scale-110 group cursor-pointer border border-white/10 rounded-lg",
                                             node.is_key_personnel ? "bg-primary shadow-lg shadow-primary/20 scale-105 z-10" : "bg-white/10"
                                           )}
                                           title={`${node.job_position?.name} (Nivel ${level})`}
                                         >
                                            <div className="text-[11px] font-bold text-white px-2 text-center leading-tight">
                                               {node.job_position?.name}
                                            </div>
                                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                                         </div>
                                      ))}
                                   </div>
                                </div>
                             );
                          });
                       })()}
                       
                       {/* Background Pyramid Decoration */}
                       <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-primary/50 to-transparent z-0 opacity-10 pointer-events-none" />
                    </div>

                    <div className="mt-12 pt-8 border-t border-white/5 grid grid-cols-2 gap-4">
                       <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                          <p className="text-[9px] font-black text-slate-500 uppercase">Estructura</p>
                          <p className="text-sm font-bold">{nodes.length} Niveles</p>
                       </div>
                       <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                          <p className="text-[9px] font-black text-slate-500 uppercase">Personal Clave</p>
                          <p className="text-sm font-bold text-primary">{nodes.filter(n => n.is_key_personnel).length} Directivos</p>
                       </div>
                    </div>
                  </Card>

                  <Card className="p-8 rounded-[2.5rem] bg-slate-50 border-none shadow-sm text-slate-800">
                     <h3 className="text-xl font-black text-slate-800 mb-1">Numeral 5: Estructura</h3>
                     <p className="text-slate-500 text-sm font-medium mb-8">Cumplimiento normativo del laboratorio...</p>
                     
                     <div className="space-y-6">
                       <div className="flex gap-4">
                          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                          <div>
                            <p className="text-sm font-black text-slate-800">Identificación de la Dirección</p>
                            <p className="text-xs text-slate-500 mt-1 font-bold">Responsabilidad global definida.</p>
                          </div>
                       </div>
                     </div>
                  </Card>
                </div>
             </div>
           )}

          {/* TAB: PROCESOS (MAPA) */}
          {activeTab === 'processes' && (
            <div className="space-y-12">
               <div className="flex justify-between items-center mb-8">
                 <div>
                    <h3 className="text-2xl font-black text-slate-800">Mapa de Procesos Operativos</h3>
                    <p className="text-sm font-bold text-slate-400">Identificación de responsabilidades por proceso organizacional.</p>
                 </div>
                 <Button onClick={() => setIsProcessModalOpen(true)} className="rounded-[1.25rem] h-12 px-6 font-black bg-slate-100 text-slate-600">
                    <Plus className="w-4 h-4 mr-2" />
                    AÑADIR PROCESO
                 </Button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['Estratégico', 'Operativo', 'Apoyo'].map(type => (
                    <div key={type} className="space-y-4">
                       <h4 className={clsx(
                         "text-[10px] font-black uppercase tracking-[0.2em] pl-4",
                         type === 'Estratégico' ? "text-blue-500" : type === 'Operativo' ? "text-primary" : "text-amber-500"
                       )}>{type}s</h4>
                       
                       <div className="space-y-4">
                         {processes.filter(p => p.type === type).map(p => (
                           <Card key={p.id} className="p-6 rounded-[2rem] border-none shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                              <div className="absolute top-0 right-0 w-2 h-full bg-slate-50 group-hover:bg-primary transition-colors" />
                              <div className="flex items-center gap-4 mb-2">
                                 <Blocks className="w-5 h-5 text-slate-400" />
                                 <span className="text-sm font-black text-slate-700">{p.name}</span>
                              </div>
                              <p className="text-xs text-slate-400 font-medium leading-relaxed">{p.description}</p>
                           </Card>
                         ))}
                         {processes.filter(p => p.type === type).length === 0 && (
                           <div className="p-6 bg-slate-50/50 border border-dashed border-slate-200 rounded-[2rem] text-center text-slate-400 text-xs font-bold">
                              Sin procesos definidos
                           </div>
                         )}
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {/* TAB: IMPARCIALIDAD (Numeral 4.1 y 4.2) */}
          {activeTab === 'impartiality' && (
            <div className="space-y-10">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Card 4.2 Confidentiality */}
                  <Card className="p-8 rounded-[2.5rem] bg-slate-50 border-none shadow-sm text-slate-800 md:col-span-1">
                     <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                           <ShieldCheck className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h4 className="font-black text-lg text-slate-800">4.2 Confidencialidad</h4>
                     </div>
                     <p className="text-xs text-slate-500 font-bold mb-6 leading-relaxed">
                        El laboratorio es responsable de la gestión de toda la información obtenida. 
                        El personal debe mantener el carácter confidencial.
                     </p>
                     <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-black bg-white border border-slate-100 p-3 rounded-xl text-slate-700">
                           <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                           COMPROMISOS FIRMADOS
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black bg-white border border-slate-100 p-3 rounded-xl text-slate-700">
                           <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                           ACCESO RESTRINGIDO
                        </div>
                     </div>
                  </Card>

                  <div className="md:col-span-2 space-y-6">
                     <div className="flex justify-between items-center">
                        <div>
                           <h3 className="text-xl font-black text-slate-800">Matriz de Riesgos a la Imparcialidad</h3>
                           <p className="text-sm font-bold text-slate-500 font-bold">Identificación y medidas de mitigación del riesgo (4.1.4)</p>
                        </div>
                        <Button onClick={() => setIsRiskModalOpen(true)} className="rounded-[1.25rem] h-12 px-6 font-black bg-slate-900 shadow-xl shadow-slate-200 text-white">
                           <Plus className="w-4 h-4 mr-2" />
                           IDENTIFICAR RIESGO
                        </Button>
                     </div>

                     <div className="grid grid-cols-1 gap-4">
                        {risks.map(risk => (
                          <Card key={risk.id} className="p-6 rounded-[2.5rem] border-none shadow-sm hover:shadow-lg transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                             <div className="flex items-start gap-5 flex-1">
                                <div className={clsx(
                                   "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                                   risk.risk_level === 'Alto' ? "bg-red-50 text-red-500" : risk.risk_level === 'Medio' ? "bg-amber-50 text-amber-500" : "bg-green-50 text-green-500"
                                )}>
                                   <AlertTriangle className="w-6 h-6" />
                                </div>
                                <div>
                                   <div className="flex items-center gap-3 mb-1">
                                      <span className={clsx(
                                         "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                                         risk.risk_level === 'Alto' ? "bg-red-500 text-white" : risk.risk_level === 'Medio' ? "bg-amber-500 text-white" : "bg-green-500 text-white"
                                      )}>Nivel {risk.risk_level}</span>
                                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado: {risk.status}</span>
                                   </div>
                                   <h4 className="text-sm font-black text-slate-800">{risk.risk_description}</h4>
                                   <p className="text-xs text-slate-600 mt-2 font-bold bg-slate-100/50 p-2 rounded-lg italic">
                                     Mitigación: {risk.mitigation_actions || 'No definida'}
                                   </p>
                                </div>
                             </div>
                          </Card>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          )}

          {/* TAB: GUIA DE AYUDA / INSTRUCCIONES */}
          {activeTab === 'help' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="flex items-center gap-4 bg-primary/5 p-8 rounded-[2.5rem] border border-primary/10">
                  <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-primary shadow-sm border border-primary/5">
                     <BookOpen className="w-8 h-8" />
                  </div>
                  <div>
                     <h2 className="text-2xl font-black text-slate-800">Guía de Diligenciamiento</h2>
                     <p className="text-sm font-bold text-slate-500">Instrucciones paso a paso para la configuración del módulo de Gestión Organizacional</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Tutorial Structure */}
                  <Card className="p-8 rounded-[2.5rem] border-none shadow-sm hover:shadow-md transition-all group overflow-visible">
                     <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <GitGraph className="w-6 h-6" />
                     </div>
                     <h3 className="text-lg font-black text-slate-800 mb-4">Estructura Jerárquica</h3>
                     <ul className="space-y-4">
                        <li className="flex gap-3 text-xs font-bold text-slate-500">
                           <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 font-black text-[10px]">1</div>
                           <span>Asegúrese de tener configurados previamente los <b>Cargos</b> en la sección de Configuración.</span>
                        </li>
                        <li className="flex gap-3 text-xs font-bold text-slate-500">
                           <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 font-black text-[10px]">2</div>
                           <span>Haga clic en <b>Gestionar Nodos</b> para vincular un cargo a la estructura visual del laboratorio.</span>
                        </li>
                        <li className="flex gap-3 text-xs font-bold text-slate-500">
                           <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 font-black text-[10px]">3</div>
                           <span>Defina el <b>Cargo Superior</b> (quién reporta a quién) para construir el organigrama.</span>
                        </li>
                     </ul>
                  </Card>

                  {/* Tutorial Processes */}
                  <Card className="p-8 rounded-[2.5rem] border-none shadow-sm hover:shadow-md transition-all group overflow-visible">
                     <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Network className="w-6 h-6" />
                     </div>
                     <h3 className="text-lg font-black text-slate-800 mb-4">Mapa de Procesos</h3>
                     <ul className="space-y-4">
                        <li className="flex gap-3 text-xs font-bold text-slate-500">
                           <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 font-black text-[10px]">1</div>
                           <span>Haga clic en <b>Añadir Proceso</b> para registrar una nueva actividad organizacional.</span>
                        </li>
                        <li className="flex gap-3 text-xs font-bold text-slate-500">
                           <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 font-black text-[10px]">2</div>
                           <span>Clasifique el proceso: <b>Estratégico</b> (Dirección), <b>Operativo</b> (Misión) o <b>Apoyo</b> (Recursos).</span>
                        </li>
                        <li className="flex gap-3 text-xs font-bold text-slate-500">
                           <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5 font-black text-[10px]">3</div>
                           <span>Los procesos se visualizarán automáticamente agrupados por su respectiva categoría.</span>
                        </li>
                     </ul>
                  </Card>

                  {/* Tutorial Risks */}
                  <Card className="p-8 rounded-[2.5rem] border-none shadow-sm hover:shadow-md transition-all group overflow-visible">
                     <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-red-600 group-hover:text-white transition-colors">
                        <ShieldAlert className="w-6 h-6" />
                     </div>
                     <h3 className="text-lg font-black text-slate-800 mb-4">Imparcialidad y Riesgos</h3>
                     <ul className="space-y-4">
                        <li className="flex gap-3 text-xs font-bold text-slate-500">
                           <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5 font-black text-[10px]">1</div>
                           <span>Identifique posibles amenazas a la imparcialidad (Numeral 4.1.4 de la norma).</span>
                        </li>
                        <li className="flex gap-3 text-xs font-bold text-slate-500">
                           <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5 font-black text-[10px]">2</div>
                           <span>Defina el <b>Nivel de Riesgo</b> y describa el <b>Impacto Potencial</b>.</span>
                        </li>
                        <li className="flex gap-3 text-xs font-bold text-slate-500">
                           <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5 font-black text-[10px]">3</div>
                           <span>Registre las <b>Acciones de Mitigación</b> para eliminar o reducir el riesgo identificado.</span>
                        </li>
                     </ul>
                  </Card>
               </div>

               {/* Bottom Info */}
               <div className="mt-8 flex items-center gap-3 bg-amber-50 text-amber-700 p-6 rounded-[2rem] border border-amber-100">
                  <ListChecks className="w-6 h-6" />
                  <p className="text-xs font-bold">Nota: La correcta configuración de estos elementos asegura el cumplimiento de las cláusulas 4 y 5 de la norma ISO/IEC 17025:2017.</p>
               </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Nuevo Riesgo */}
      <Modal isOpen={isRiskModalOpen} onClose={() => setIsRiskModalOpen(false)} title="Identificar Riesgo a la Imparcialidad">
         <form onSubmit={handleSaveRisk} className="space-y-6">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Descripción del Riesgo</label>
               <textarea required className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold min-h-[120px] focus:ring-2 focus:ring-primary/20 outline-none" value={newRisk.risk_description || ''} onChange={(e) => setNewRisk({...newRisk, risk_description: e.target.value})} placeholder="Ej: Influencia de la gerencia comercial sobre los resultados técnicos..." />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nivel Inicial</label>
                  <select className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-black focus:ring-2 focus:ring-primary/20 outline-none" value={newRisk.risk_level} onChange={(e) => setNewRisk({...newRisk, risk_level: e.target.value as any})}>
                     <option value="Bajo">Bajo</option>
                     <option value="Medio">Medio</option>
                     <option value="Alto">Alto</option>
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Estado</label>
                  <select className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-black focus:ring-2 focus:ring-primary/20 outline-none" value={newRisk.status} onChange={(e) => setNewRisk({...newRisk, status: e.target.value as any})}>
                     <option value="Identificado">Identificado</option>
                     <option value="Mitigado">Mitigado</option>
                     <option value="Eliminado">Eliminado</option>
                  </select>
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Acciones de Mitigación</label>
               <textarea className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold min-h-[100px] focus:ring-2 focus:ring-primary/20 outline-none" value={newRisk.mitigation_actions || ''} onChange={(e) => setNewRisk({...newRisk, mitigation_actions: e.target.value})} placeholder="Acciones permanentes para eliminar o reducir el riesgo..." />
            </div>

            <div className="pt-4 flex gap-3">
               <Button type="button" variant="outline" onClick={() => setIsRiskModalOpen(false)} className="flex-1 h-12 rounded-2xl font-black tracking-widest text-[10px]">CANCELAR</Button>
               <Button type="submit" disabled={isSubmitting} className="flex-1 h-12 rounded-2xl font-black bg-primary text-white tracking-widest text-[10px]">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  GUARDAR RIESGO
               </Button>
            </div>
         </form>
      </Modal>

      {/* Modal: Nuevo Proceso */}
      <Modal isOpen={isProcessModalOpen} onClose={() => setIsProcessModalOpen(false)} title="Añadir Proceso Organizacional">
         <form onSubmit={handleSaveProcess} className="space-y-6">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nombre del Proceso</label>
               <input required className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" value={newProcess.name || ''} onChange={(e) => setNewProcess({...newProcess, name: e.target.value})} placeholder="Ej: Calibración de Equipos" />
            </div>
            
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tipo de Proceso</label>
               <select className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-black focus:ring-2 focus:ring-primary/20 outline-none" value={newProcess.type} onChange={(e) => setNewProcess({...newProcess, type: e.target.value as any})}>
                  <option value="Operativo">Operativo (Misión)</option>
                  <option value="Estratégico">Estratégico (Gestión)</option>
                  <option value="Apoyo">Apoyo (Recursos)</option>
               </select>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Descripción</label>
               <textarea className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold min-h-[100px] focus:ring-2 focus:ring-primary/20 outline-none" value={newProcess.description || ''} onChange={(e) => setNewProcess({...newProcess, description: e.target.value})} placeholder="Breve descripción de las actividades..." />
            </div>

            <div className="pt-4 flex gap-3">
               <Button type="button" variant="outline" onClick={() => setIsProcessModalOpen(false)} className="flex-1 h-12 rounded-2xl font-black tracking-widest text-[10px]">CANCELAR</Button>
               <Button type="submit" disabled={isSubmitting} className="flex-1 h-12 rounded-2xl font-black bg-primary text-white tracking-widest text-[10px]">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  GUARDAR PROCESO
               </Button>
            </div>
         </form>
      </Modal>

      {/* Modal: Nuevo Nodo Jerarquía */}
      <Modal 
        isOpen={isNodeModalOpen} 
        onClose={() => { setIsNodeModalOpen(false); setEditingNodeId(null); setNewNode({ job_position_id: '', parent_node_id: null, authority_level: 1, is_key_personnel: false }); }} 
        title={editingNodeId ? "Editar Nivel Jerárquico" : "Gestionar Jerarquía Organizacional"}
      >
         <form onSubmit={handleSaveNode} className="space-y-6">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Cargo Vinculado</label>
               <select required className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-black focus:ring-2 focus:ring-primary/20 outline-none" value={newNode.job_position_id} onChange={(e) => setNewNode({...newNode, job_position_id: e.target.value})}>
                  <option value="">-- Seleccionar Cargo --</option>
                  {positions.map(pos => (
                    <option key={pos.id} value={pos.id}>{pos.name}</option>
                  ))}
               </select>
            </div>
            
            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Cargo Superior (Reporta a)</label>
               <select className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-black focus:ring-2 focus:ring-primary/20 outline-none" value={newNode.parent_node_id || ''} onChange={(e) => setNewNode({...newNode, parent_node_id: e.target.value || null})}>
                  <option value="">-- Nivel Máximo (Sin Reporte) --</option>
                  {positions.filter(p => p.id !== newNode.job_position_id).map(pos => (
                    <option key={pos.id} value={pos.id}>{pos.name}</option>
                  ))}
               </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Prioridad Visual (1-10)</label>
                <input type="number" min="1" max="10" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" value={newNode.authority_level} onChange={(e) => setNewNode({...newNode, authority_level: parseInt(e.target.value)})} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input type="checkbox" id="isKey" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20" checked={newNode.is_key_personnel} onChange={(e) => setNewNode({...newNode, is_key_personnel: e.target.checked})} />
                <label htmlFor="isKey" className="text-xs font-bold text-slate-600 cursor-pointer">Personal Clave (5.2)</label>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
               <Button type="button" variant="outline" onClick={() => { setIsNodeModalOpen(false); setEditingNodeId(null); setNewNode({ job_position_id: '', parent_node_id: null, authority_level: 1, is_key_personnel: false }); }} className="flex-1 h-12 rounded-2xl font-black tracking-widest text-[10px]">CANCELAR</Button>
               <Button type="submit" disabled={isSubmitting} className="flex-1 h-12 rounded-2xl font-black bg-primary text-white tracking-widest text-[10px]">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  GUARDAR JERARQUÍA
               </Button>
            </div>
         </form>
      </Modal>
    </div>
  );
}

// --- Helper Components for Sortable Node ---

function SortableNode({ node, isAdmin, onEdit, onDelete }: { node: OrgNode, isAdmin: boolean, onEdit: any, onDelete: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : 1
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={clsx(
        "flex items-center justify-between p-4 rounded-2xl border transition-all group",
        isDragging ? "bg-white shadow-2xl border-primary" : "bg-slate-50 border-slate-100/50 hover:bg-white hover:shadow-md"
      )}
    >
      <div className="flex items-center gap-4">
        {isAdmin && (
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-500">
            <GripVertical className="w-5 h-5" />
          </div>
        )}
        <div className={clsx(
          "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm transition-all group-hover:scale-110",
          node.authority_level > 5 ? "bg-slate-800" : node.is_key_personnel ? "bg-primary" : "bg-slate-300"
        )}>
          <GitGraph className="w-5 h-5" />
        </div>
        <div>
          <span className="text-sm font-black text-slate-700 transition-colors group-hover:text-primary">{node.job_position?.name}</span>
          <div className="flex items-center gap-2 mt-0.5">
            {node.is_key_personnel && <span className="text-[8px] font-black uppercase tracking-widest bg-yellow-400 text-white px-1.5 py-0.5 rounded shadow-sm shadow-yellow-200">Personal Clave (5.2)</span>}
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded">Nivel {node.authority_level}</span>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
          <button 
            onClick={() => onEdit(node)}
            className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
            title="Editar Nivel"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onDelete(node.id)}
            className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"
            title="Eliminar del organigrama"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// Icon helper since some might be missing in older lucide
const CheckCircle2 = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
);
