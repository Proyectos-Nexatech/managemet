import { supabase } from '../lib/supabase';

export interface IntermediateCheckResult {
  id: string;
  check_id: string;
  point_number: number;
  nominal_value: number;
  reference_value: number;
  work_value: number;
  deviation: number;
  is_acceptable: boolean;
}

export interface IntermediateCheck {
  id: string;
  confirmation_id: string | null;
  equipment_id: string;
  check_date: string | null;
  next_check_date: string | null;
  reference_standard_id: string | null;
  work_standard_id: string | null;
  status: 'pending' | 'completed' | 'overdue';
  performed_by: string | null;
  created_at: string;
  equipment?: { name: string; internal_id: string };
  performer?: { full_name: string };
  results?: IntermediateCheckResult[];
}

export const intermediateChecksService = {
  async getAll(equipmentId?: string) {
    let query = supabase
      .from('intermediate_checks')
      .select(`
        *,
        equipment:equipment(name, internal_id),
        performer:user_profiles(full_name)
      `)
      .order('next_check_date', { ascending: true });

    if (equipmentId) {
      query = query.eq('equipment_id', equipmentId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as IntermediateCheck[];
  },

  async create(check: Partial<IntermediateCheck>) {
    const { data, error } = await supabase
      .from('intermediate_checks')
      .insert([check])
      .select()
      .single();

    if (error) throw error;
    return data as IntermediateCheck;
  },

  async addResult(result: Partial<IntermediateCheckResult>) {
    const { data, error } = await supabase
      .from('intermediate_check_results')
      .insert([result])
      .select()
      .single();

    if (error) throw error;
    return data as IntermediateCheckResult;
  },

  async complete(id: string, performedBy: string, checkDate: string) {
    const { error } = await supabase
      .from('intermediate_checks')
      .update({ 
        status: 'completed', 
        performed_by: performedBy, 
        check_date: checkDate 
      })
      .eq('id', id);
    
    if (error) throw error;
  }
};
