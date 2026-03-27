import { supabase } from '../lib/supabase';

export interface CorrectiveAction {
  id: string;
  code: string;
  source: 'nc' | 'audit' | 'observation' | 'risk' | 'complaint';
  source_ref_id: string | null;
  title: string;
  description: string | null;
  root_cause: string | null;
  proposed_action: string;
  responsible: string;
  due_date: string;
  status: 'open' | 'in_progress' | 'implemented' | 'verified' | 'closed';
  implementation_date: string | null;
  verification_date: string | null;
  verified_by: string | null;
  effectiveness: 'effective' | 'ineffective' | 'pending' | null;
  evidence_url: string | null;
  created_at: string;
}

export const correctiveActionService = {
  async getAll() {
    const { data, error } = await supabase
      .from('corrective_actions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as CorrectiveAction[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('corrective_actions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as CorrectiveAction;
  },

  async create(ca: Partial<CorrectiveAction>) {
    // Generate code AC-YYYY-NNN
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('corrective_actions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${year}-01-01`);
    
    const countFormatted = String((count || 0) + 1).padStart(3, '0');
    const code = `AC-${year}-${countFormatted}`;

    const { data, error } = await supabase
      .from('corrective_actions')
      .insert([{ ...ca, code }])
      .select()
      .single();
    
    if (error) throw error;
    return data as CorrectiveAction;
  },

  async update(id: string, updates: Partial<CorrectiveAction>) {
    const { data, error } = await supabase
      .from('corrective_actions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as CorrectiveAction;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('corrective_actions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async uploadEvidence(file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `ca_evidence/${fileName}`;

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
