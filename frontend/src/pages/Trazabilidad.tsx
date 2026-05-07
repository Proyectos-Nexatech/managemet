import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GitBranch, Plus, Download, RefreshCw, AlertTriangle, Building, Loader2, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  MarkerType,
  Panel,
} from '@xyflow/react';
import type { Node, Edge, Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { traceabilityService, type TraceableEquipment, type ExternalLaboratory, type TraceabilityNode } from '../services/traceability';
// import { magnitudesService, type Magnitude } from '../services/magnitudes';

import { useAuth } from '../contexts/AuthContext';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { EquipmentNode } from '../components/traceability/EquipmentNode';
import { LabModal } from '../components/traceability/LabModal';
import { LinkModal } from '../components/traceability/LinkModal';

const nodeTypes = { equipment: EquipmentNode };

const LEVEL_COLORS: Record<string, string> = {
  'INM': '#0f172a',
  'Patrón Nacional': '#1d4ed8',
  'Patrón de Referencia': '#7c3aed',
  'Patrón de Trabajo': '#0891b2',
  'Equipo de Trabajo': '#059669',
};

const LEVEL_Y: Record<string, number> = {
  'INM': 0,
  'Patrón Nacional': 160,
  'Patrón de Referencia': 320,
  'Patrón de Trabajo': 480,
  'Equipo de Trabajo': 640,
};

function flattenTree(nodes: TraceabilityNode[]): TraceabilityNode[] {
  return nodes.flatMap(n => [n, ...flattenTree(n.children)]);
}

function getAncestorIds(all: TraceableEquipment[], equipmentId: string): Set<string> {
  const ids = new Set<string>();
  let current = all.find(e => e.id === equipmentId);
  while (current?.parent_equipment_id) {
    ids.add(current.parent_equipment_id);
    current = all.find(e => e.id === current!.parent_equipment_id);
  }
  return ids;
}

function getDescendantIds(all: TraceableEquipment[], equipmentId: string): Set<string> {
  const ids = new Set<string>();
  const queue = [equipmentId];
  while (queue.length) {
    const cur = queue.shift()!;
    all.filter(e => e.parent_equipment_id === cur).forEach(c => { ids.add(c.id); queue.push(c.id); });
  }
  return ids;
}

function buildFlowElements(
  all: TraceableEquipment[],
  fullTree: TraceabilityNode[],
  selectedId: string | null
): { nodes: Node[]; edges: Edge[] } {
  let visibleIds: Set<string>;
  if (selectedId) {
    visibleIds = new Set([selectedId, ...getAncestorIds(all, selectedId), ...getDescendantIds(all, selectedId)]);
  } else {
    visibleIds = new Set(all.map(e => e.id));
  }

  const flat = flattenTree(fullTree).filter(n => visibleIds.has(n.id));

  const byLevel: Record<string, TraceabilityNode[]> = {};
  flat.forEach(n => {
    const lvl = n.equipment.traceability_level || 'Equipo de Trabalho';
    if (!byLevel[lvl]) byLevel[lvl] = [];
    byLevel[lvl].push(n);
  });

  const flowNodes: Node[] = flat.map(n => {
    const lvl = n.equipment.traceability_level || 'Equipo de Trabajo';
    const siblings = byLevel[lvl] || [n];
    const idx = siblings.indexOf(n);
    const spacing = 300;
    const x = idx * spacing - (siblings.length - 1) * spacing / 2 + 500;
    const y = LEVEL_Y[lvl] ?? n.depth * 160;
    return {
      id: n.id,
      type: 'equipment',
      position: { x, y },
      data: { node: n, color: LEVEL_COLORS[lvl] ?? '#64748b', isSelected: n.id === selectedId },
      style: n.id === selectedId ? { filter: 'drop-shadow(0 0 12px rgba(79,70,229,0.35))' } : undefined,
    };
  });

  const flowEdges: Edge[] = flat
    .filter(n => n.equipment.parent_equipment_id && visibleIds.has(n.equipment.parent_equipment_id))
    .map(n => ({
      id: `e-${n.equipment.parent_equipment_id}-${n.id}`,
      source: n.equipment.parent_equipment_id!,
      target: n.id,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: n.isExpired ? '#ef4444' : n.isMagnitudeMismatch ? '#f59e0b' : '#94a3b8', strokeWidth: 2 },
      animated: n.isExpired,
    }));

  return { nodes: flowNodes, edges: flowEdges };
}

export function Trazabilidad() {
  const { profile } = useAuth();
  const isAdmin = profile?.role?.name === 'admin';
  const flowRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const [allEquipment, setAllEquipment] = useState<TraceableEquipment[]>([]);
  const [labs, setLabs] = useState<ExternalLaboratory[]>([]);
  const [loading, setLoading] = useState(true);

  const [fullTree, setFullTree] = useState<TraceabilityNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('eq'));

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [isLabModalOpen, setIsLabModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const selectedEquipment = allEquipment.find(e => e.id === selectedId) ?? null;

  const chainAlerts = (() => {
    if (!selectedId) return [];
    const visibleIds = new Set([selectedId, ...getAncestorIds(allEquipment, selectedId), ...getDescendantIds(allEquipment, selectedId)]);
    return flattenTree(fullTree).filter(n => visibleIds.has(n.id) && (n.isExpired || n.isMagnitudeMismatch || n.uncertaintyWarning));
  })();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eqData, labData] = await Promise.all([
        traceabilityService.getAll(),
        traceabilityService.getLaboratories()
      ]);
      setAllEquipment(eqData);
      setLabs(labData);
      setFullTree(traceabilityService.buildTree(eqData));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!allEquipment.length) return;
    const { nodes: fn, edges: fe } = buildFlowElements(allEquipment, fullTree, selectedId);
    setNodes(fn);
    setEdges(fe);
  }, [selectedId, allEquipment, fullTree]);

  const handleSelect = (id: string) => {
    setSelectedId(id || null);
    if (id) setSearchParams({ eq: id }); else setSearchParams({});
  };

  const onConnect = useCallback((conn: Connection) => setEdges(e => addEdge(conn, e)), [setEdges]);

  const handleExportPDF = async () => {
    if (!flowRef.current) return;
    try {
      setIsExporting(true);
      const canvas = await html2canvas(flowRef.current, { scale: 2, backgroundColor: '#f8fafc', useCORS: true });
      const doc = new jsPDF('l', 'mm', 'a4');
      const pw = doc.internal.pageSize.width;
      const ph = doc.internal.pageSize.height;
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pw, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('ManageMet — Carta de Trazabilidad Metrológica (ISO/IEC 17025)', 10, 10);
      if (selectedEquipment) { doc.setFontSize(9); doc.text(`Equipo: ${selectedEquipment.name}  |  S/N: ${selectedEquipment.serial_number || 'N/A'}`, 10, 17); }
      doc.setFontSize(9); doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, pw - 10, 10, { align: 'right' });
      const imgData = canvas.toDataURL('image/png');
      const ratio = canvas.width / canvas.height;
      doc.addImage(imgData, 'PNG', 10, 27, pw - 20, Math.min((pw - 20) / ratio, ph - 50));
      doc.setFontSize(8); doc.setTextColor(148, 163, 184);
      doc.text(`Responsable: ${profile?.full_name || '___________________'}`, 10, ph - 8);
      doc.text('Firma: ___________________', pw - 10, ph - 8, { align: 'right' });
      doc.save(`Trazabilidad_${selectedEquipment?.name || 'General'}_${new Date().toISOString().split('T')[0]}.pdf`);
    } finally { setIsExporting(false); }
  };

  return (
    <div className="p-8 space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Trazabilidad Metrológica</h1>
            <p className="text-sm font-bold text-slate-400">Cadena de calibración por equipo — ISO/IEC 17025</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={fetchData} className="gap-2 rounded-2xl font-bold border-slate-200 h-10">
            <RefreshCw className="w-4 h-4" />Actualizar
          </Button>
          {isAdmin && (
            <>
              <Button variant="outline" onClick={() => setIsLabModalOpen(true)} className="gap-2 rounded-2xl font-bold border-slate-200 h-10">
                <Building className="w-4 h-4" />Laboratorios
              </Button>
              <Button variant="outline" onClick={() => setIsLinkModalOpen(true)} className="gap-2 rounded-2xl font-bold border-slate-200 h-10">
                <Plus className="w-4 h-4" />Configurar Trazabilidad
              </Button>
            </>
          )}
          <Button onClick={handleExportPDF} disabled={isExporting || !selectedId} className="gap-2 rounded-2xl font-black h-10 bg-primary text-white shadow-lg shadow-primary/20">
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Equipment Selector */}
      <Card className="p-5 rounded-[2rem] border-none shadow-sm bg-white">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seleccionar Equipo</p>
            <div className="relative">
              <select
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 appearance-none focus:outline-none focus:ring-4 focus:ring-primary/5 cursor-pointer"
                value={selectedId || ''}
                onChange={e => handleSelect(e.target.value)}
              >
                <option value="">— Seleccionar un equipo para ver su cadena —</option>
                {allEquipment.map(eq => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name}{eq.serial_number ? ` · S/N ${eq.serial_number}` : ''}{eq.traceability_level ? ` [${eq.traceability_level}]` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          {selectedEquipment && (
            <div className="flex items-center gap-4 px-4 py-3 bg-primary/5 rounded-2xl border border-primary/10">
              <div>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest">{selectedEquipment.traceability_level || 'Sin nivel'}</p>
                <p className="text-sm font-black text-slate-800">{selectedEquipment.name}</p>
                <p className="text-[10px] font-bold text-slate-400">{(selectedEquipment as any).magnitude?.name || 'Sin magnitud'}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Alerts */}
      {chainAlerts.length > 0 && (
        <Card className="p-4 rounded-[2rem] border-none bg-red-50 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-sm font-black text-red-700 uppercase tracking-widest">{chainAlerts.length} Alerta{chainAlerts.length > 1 ? 's' : ''} en esta cadena</span>
          </div>
          <div className="space-y-2">
            {chainAlerts.map(a => (
              <div key={a.id} className="flex items-center gap-3 text-xs font-bold text-red-600">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span className="font-black">{a.equipment.name}</span>
                {a.isExpired && <span className="px-2 py-0.5 bg-red-100 rounded-lg">Certificado Vencido</span>}
                {a.isMagnitudeMismatch && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-lg">Magnitud Incompatible</span>}
                {a.uncertaintyWarning && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-lg">Incertidumbre Inválida</span>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(LEVEL_COLORS).map(([lvl, color]) => (
          <div key={lvl} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{lvl}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-red-400" />
          <span className="text-[10px] font-black text-slate-400">Vencido</span>
        </div>
      </div>

      {/* Flow Diagram */}
      <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden" style={{ height: 620 }}>
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !selectedId ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-4">
            <div className="w-16 h-16 rounded-[1.5rem] bg-primary/5 flex items-center justify-center">
              <GitBranch className="w-8 h-8 text-primary/30" />
            </div>
            <div>
              <p className="font-black text-slate-600">Selecciona un equipo para ver su carta de trazabilidad</p>
              <p className="text-sm font-bold text-slate-400 mt-1">
                También puedes acceder directamente desde el ícono <GitBranch className="w-3 h-3 inline" /> en el Inventario de Equipos.
              </p>
            </div>
          </div>
        ) : nodes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-4">
            <div className="w-16 h-16 rounded-[1.5rem] bg-amber-50 flex items-center justify-center">
              <GitBranch className="w-8 h-8 text-amber-400" />
            </div>
            <p className="font-black text-slate-600">Este equipo no tiene cadena de trazabilidad configurada</p>
            {isAdmin && (
              <Button onClick={() => setIsLinkModalOpen(true)} className="rounded-2xl font-black bg-primary text-white px-6">
                <Plus className="w-4 h-4 mr-2" />Configurar Trazabilidad
              </Button>
            )}
          </div>
        ) : (
          <div ref={flowRef} className="w-full h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={isAdmin ? onConnect : undefined}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.25 }}
              proOptions={{ hideAttribution: true }}
            >
              <Controls className="rounded-2xl border-none shadow-md" />
              <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#e2e8f0" />
              <Panel position="top-right">
                <div className="bg-white rounded-2xl shadow-md px-3 py-2 text-[10px] font-bold text-slate-500 border border-slate-100">
                  {nodes.length} nodo{nodes.length !== 1 ? 's' : ''} en la cadena
                </div>
              </Panel>
            </ReactFlow>
          </div>
        )}
      </Card>

      <LabModal isOpen={isLabModalOpen} onClose={() => setIsLabModalOpen(false)} labs={labs} onSaved={fetchData} />
      <LinkModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        allEquipment={allEquipment}
        labs={labs}
        initialEquipment={selectedEquipment}
        onSaved={fetchData}
      />
    </div>
  );
}
