import { supabase } from '../lib/supabase';

export interface Audit {
  id: string;
  audit_code: string;
  title: string;
  type: 'internal' | 'external' | 'follow_up';
  scope: string | null;
  standard: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  lead_auditor: string;
  audit_team: string | null;
  auditee_area: string | null;
  planned_date: string;
  end_date: string | null;
  objective: string | null;
  conclusion: string | null;
  total_findings: number;
  created_at: string;
  // Joins
  audit_findings?: AuditFinding[];
  audit_checklist_items?: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  audit_id: string;
  clause: string;
  requirement: string;
  result: 'conforming' | 'non_conforming' | 'observation' | 'not_applicable' | 'pending';
  evidence: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
}

export interface AuditFinding {
  id: string;
  audit_id: string;
  checklist_item_id: string | null;
  nc_id: string | null;
  finding_type: 'non_conformity' | 'observation' | 'opportunity';
  description: string;
  clause_ref: string | null;
  severity: string;
  created_at: string;
}

// Pre-loaded ISO 17025:2017 checklist clauses
const ISO_17025_CHECKLIST: { clause: string; requirement: string }[] = [
  { clause: '4.1', requirement: 'Imparcialidad — El laboratorio debe llevar a cabo actividades de forma imparcial y estructurada.' },
  { clause: '4.2', requirement: 'Confidencialidad — Compromiso de proteger la información confidencial.' },
  { clause: '5.1', requirement: 'Requisitos generales de estructura — Legal, responsable de actividades.' },
  { clause: '5.2', requirement: 'Estructura organizacional documentada y roles definidos.' },
  { clause: '5.3', requirement: 'La dirección técnica tiene recursos necesarios para asegurar calidad.' },
  { clause: '6.1', requirement: 'Requisitos generales de recursos — Disponibilidad de personal, instalaciones y equipo.' },
  { clause: '6.2', requirement: 'Personal — Competencia, formación y supervisión del personal.' },
  { clause: '6.3', requirement: 'Instalaciones y condiciones ambientales controladas y monitoreadas.' },
  { clause: '6.4', requirement: 'Equipamiento — Calibrado, mantenido y verificado.' },
  { clause: '6.5', requirement: 'Trazabilidad metrológica — Cadena ininterrumpida de calibraciones.' },
  { clause: '6.6', requirement: 'Productos y servicios suministrados externamente evaluados.' },
  { clause: '7.1', requirement: 'Revisión de solicitudes, ofertas y contratos.' },
  { clause: '7.2', requirement: 'Selección, verificación y validación de métodos.' },
  { clause: '7.3', requirement: 'Muestreo — Planes y métodos de muestreo.' },
  { clause: '7.4', requirement: 'Manipulación de los ítems de ensayo o calibración.' },
  { clause: '7.5', requirement: 'Registros técnicos — Completos y con trazabilidad.' },
  { clause: '7.6', requirement: 'Evaluación de la incertidumbre de medición.' },
  { clause: '7.7', requirement: 'Aseguramiento de la validez de los resultados.' },
  { clause: '7.8', requirement: 'Informe de resultados — Contenido y emisión.' },
  { clause: '7.9', requirement: 'Quejas — Proceso documentado para manejo de quejas.' },
  { clause: '7.10', requirement: 'Trabajo no conforme — Procedimiento de gestión.' },
  { clause: '7.11', requirement: 'Control de datos y gestión de la información.' },
  { clause: '8.1', requirement: 'Requisitos del sistema de gestión — Opción A o B.' },
  { clause: '8.2', requirement: 'Documentación del sistema de gestión.' },
  { clause: '8.3', requirement: 'Control de documentos del sistema de gestión.' },
  { clause: '8.4', requirement: 'Control de registros.' },
  { clause: '8.5', requirement: 'Acciones para abordar riesgos y oportunidades.' },
  { clause: '8.6', requirement: 'Mejora continua.' },
  { clause: '8.7', requirement: 'Acciones correctivas.' },
  { clause: '8.8', requirement: 'Auditorías internas.' },
  { clause: '8.9', requirement: 'Revisiones por la dirección.' },
];

export const auditService = {
  async getAll() {
    const { data, error } = await supabase
      .from('audits')
      .select('*, audit_findings(id)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Audit[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('audits')
      .select('*, audit_checklist_items(*), audit_findings(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Audit;
  },

  async create(audit: Partial<Audit>) {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('audits')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${year}-01-01`);
    const code = `AUD-${year}-${String((count || 0) + 1).padStart(3, '0')}`;

    const { data, error } = await supabase
      .from('audits')
      .insert([{ ...audit, audit_code: code }])
      .select()
      .single();
    if (error) throw error;
    return data as Audit;
  },

  async update(id: string, updates: Partial<Audit>) {
    const { data, error } = await supabase
      .from('audits')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Audit;
  },

  // Checklist
  async getChecklist(auditId: string) {
    const { data, error } = await supabase
      .from('audit_checklist_items')
      .select('*')
      .eq('audit_id', auditId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data as ChecklistItem[];
  },

  async generateISOChecklist(auditId: string) {
    const items = ISO_17025_CHECKLIST.map((item, i) => ({
      audit_id: auditId,
      clause: item.clause,
      requirement: item.requirement,
      result: 'pending',
      sort_order: i,
    }));
    const { error } = await supabase.from('audit_checklist_items').insert(items);
    if (error) throw error;
  },

  async updateChecklistResult(itemId: string, result: string, evidence?: string, notes?: string) {
    const { error } = await supabase
      .from('audit_checklist_items')
      .update({ result, evidence, notes })
      .eq('id', itemId);
    if (error) throw error;
  },

  // Findings
  async getFindings(auditId: string) {
    const { data, error } = await supabase
      .from('audit_findings')
      .select('*')
      .eq('audit_id', auditId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as AuditFinding[];
  },

  async addFinding(finding: Partial<AuditFinding>) {
    const { data, error } = await supabase
      .from('audit_findings')
      .insert([finding])
      .select()
      .single();
    if (error) throw error;
    return data as AuditFinding;
  },
};
