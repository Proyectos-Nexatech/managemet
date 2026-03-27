import { supabase } from '../lib/supabase';
import { type JobPosition } from './jobPositions';

export interface Process {
  id: string;
  name: string;
  type: 'Operativo' | 'Estratégico' | 'Apoyo';
  description: string | null;
  owner_id: string | null;
  owner?: JobPosition;
  created_at: string;
}

export interface ImpartialityRisk {
  id: string;
  risk_description: string;
  potential_impact: string | null;
  risk_level: 'Bajo' | 'Medio' | 'Alto';
  mitigation_actions: string | null;
  status: 'Identificado' | 'Mitigado' | 'Eliminado';
  last_review_date: string;
  created_at: string;
}

export interface OrgNode {
  id: string;
  job_position_id: string;
  parent_node_id: string | null;
  is_key_personnel: boolean;
  authority_level: number;
  job_position?: JobPosition;
}

export const organizationService = {
  // Processes
  async getProcesses() {
    const { data, error } = await supabase
      .from('processes')
      .select('*, owner:job_positions(name)')
      .order('type');
    if (error) throw error;
    return data as Process[];
  },

  async createProcess(process: Partial<Process>) {
    const { data, error } = await supabase.from('processes').insert([process]).select().single();
    if (error) throw error;
    return data as Process;
  },

  // Impartiality Risks
  async getImpartialityRisks() {
    const { data, error } = await supabase
      .from('impartiality_risks')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as ImpartialityRisk[];
  },

  async updateImpartialityRisk(id: string, updates: Partial<ImpartialityRisk>) {
    const { data, error } = await supabase.from('impartiality_risks').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as ImpartialityRisk;
  },

  async createImpartialityRisk(risk: Partial<ImpartialityRisk>) {
    const { data, error } = await supabase.from('impartiality_risks').insert([risk]).select().single();
    if (error) throw error;
    return data as ImpartialityRisk;
  },

  // Org Structure
  async getOrgNodes() {
    const { data, error } = await supabase
      .from('org_nodes')
      .select('*, job_position:job_positions(*)');
    if (error) throw error;
    return data as OrgNode[];
  },

  async updateOrgNode(id: string, updates: Partial<OrgNode>) {
    const { data, error } = await supabase.from('org_nodes').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as OrgNode;
  },

  async upsertOrgNode(node: Partial<OrgNode>) {
    const { data, error } = await supabase.from('org_nodes').upsert(node).select().single();
    if (error) throw error;
    return data as OrgNode;
  },

  async deleteOrgNode(id: string) {
    const { error } = await supabase.from('org_nodes').delete().eq('id', id);
    if (error) throw error;
  }
};
