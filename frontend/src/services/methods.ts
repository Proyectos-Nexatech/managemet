import { supabase } from '../lib/supabase';

export interface Method {
  id: string;
  code: string;
  name: string;
  type: 'calibration' | 'test' | 'sampling';
  standard_ref: string | null;
  scope: string | null;
  status: 'draft' | 'validated' | 'active' | 'deprecated';
  version: string;
  validated_by: string | null;
  validation_date: string | null;
  next_review_date: string | null;
  uncertainty_method: string | null;
  measurement_range: string | null;
  related_magnitude_id: string | null;
  document_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface MethodValidation {
  id: string;
  method_id: string;
  validation_type: 'initial' | 'periodic' | 'modification';
  parameters_evaluated: any;
  result: 'approved' | 'rejected' | 'conditional';
  conclusion: string | null;
  performed_by: string;
  validation_date: string;
  evidence_url: string | null;
  created_at: string;
}

export const methodService = {
  async getAll() {
    const { data, error } = await supabase
      .from('methods')
      .select('*')
      .order('code', { ascending: true });
    
    if (error) throw error;
    return data as Method[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('methods')
      .select('*, validaciones:method_validations(*)')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(method: Partial<Method>) {
    const { data, error } = await supabase
      .from('methods')
      .insert([method])
      .select()
      .single();
    
    if (error) throw error;
    return data as Method;
  },

  async update(id: string, updates: Partial<Method>) {
    const { data, error } = await supabase
      .from('methods')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Method;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('methods')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async addValidation(validation: Partial<MethodValidation>) {
    const { data, error } = await supabase
      .from('method_validations')
      .insert([validation])
      .select()
      .single();
    
    if (error) throw error;
    return data as MethodValidation;
  }
};
