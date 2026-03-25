import { supabase } from '../lib/supabase';

export interface NonConformity {
  id: string;
  nc_code: string;
  title: string;
  description: string;
  source: 'internal_audit' | 'external_audit' | 'client_complaint' | 'calibration' | 'observation';
  severity: 'menor' | 'mayor' | 'critica';
  status: 'open' | 'analysis' | 'in_progress' | 'closed' | 'cancelled';
  detected_by: string | null;
  detection_date: string;
  equipment_id: string | null;
  document_id: string | null;
  root_cause_method: '5-why' | 'ishikawa' | 'manual' | null;
  root_cause_summary: string | null;
  immediate_action: string | null;
  target_close_date: string | null;
  actual_close_date: string | null;
  closed_by: string | null;
  evidence_url: string | null;
  created_at: string;
  // Joins
  nc_corrective_actions?: CorrectiveAction[];
}

export interface CorrectiveAction {
  id: string;
  nc_id: string;
  action_description: string;
  responsible: string;
  due_date: string;
  status: 'pending' | 'in_progress' | 'done' | 'overdue';
  completion_date: string | null;
  evidence_notes: string | null;
  created_at: string;
}

export interface RootCauseFactor {
  id: string;
  nc_id: string;
  method: '5-why' | 'ishikawa';
  category: string | null;
  why_level: number | null;
  factor: string;
  created_at: string;
}

export const ncService = {
  async getAll() {
    const { data, error } = await supabase
      .from('non_conformities')
      .select('*, nc_corrective_actions(*)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as NonConformity[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('non_conformities')
      .select('*, nc_corrective_actions(*)')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as NonConformity;
  },

  async create(nc: Partial<NonConformity>) {
    // Generate code NC-YYYY-NNN
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('non_conformities')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${year}-01-01`);
    
    const countFormatted = String((count || 0) + 1).padStart(3, '0');
    const nc_code = `NC-${year}-${countFormatted}`;

    const { data, error } = await supabase
      .from('non_conformities')
      .insert([{ ...nc, nc_code }])
      .select()
      .single();
    
    if (error) throw error;
    return data as NonConformity;
  },

  async update(id: string, updates: Partial<NonConformity>) {
    const { data, error } = await supabase
      .from('non_conformities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as NonConformity;
  },

  async addCorrectiveAction(action: Partial<CorrectiveAction>) {
    const { data, error } = await supabase
      .from('nc_corrective_actions')
      .insert([action])
      .select()
      .single();
    
    if (error) throw error;
    return data as CorrectiveAction;
  },

  async updateAction(id: string, updates: Partial<CorrectiveAction>) {
    const { data, error } = await supabase
      .from('nc_corrective_actions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as CorrectiveAction;
  },

  async getRootCauseFactors(ncId: string) {
    const { data, error } = await supabase
      .from('nc_root_cause_factors')
      .select('*')
      .eq('nc_id', ncId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data as RootCauseFactor[];
  },

  async addRootCauseFactor(factor: Partial<RootCauseFactor>) {
    const { data, error } = await supabase
      .from('nc_root_cause_factors')
      .insert([factor])
      .select()
      .single();
    
    if (error) throw error;
    return data as RootCauseFactor;
  },

  async removeRootCauseFactor(id: string) {
    const { error } = await supabase
      .from('nc_root_cause_factors')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async uploadEvidence(file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `nc_evidence/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('managemet_assets')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('managemet_assets')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
};
