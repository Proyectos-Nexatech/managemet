import { supabase } from '../lib/supabase';

export interface EnvironmentalRecord {
  id: string;
  area: string;
  record_date: string;
  record_time: string;
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  other_params: any;
  within_limits: boolean;
  deviation_notes: string | null;
  recorded_by: string;
  created_at: string;
}

export interface EnvironmentalLimit {
  id: string;
  area: string;
  parameter: string;
  min_value: number;
  max_value: number;
  unit: string;
  is_active: boolean;
  created_at: string;
}

export const environmentalService = {
  async getRecords(limit = 100) {
    const { data, error } = await supabase
      .from('environmental_records')
      .select('*')
      .order('record_date', { ascending: false })
      .order('record_time', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data as EnvironmentalRecord[];
  },

  async createRecord(record: Partial<EnvironmentalRecord>) {
    const { data, error } = await supabase
      .from('environmental_records')
      .insert([record])
      .select()
      .single();
    
    if (error) throw error;
    return data as EnvironmentalRecord;
  },

  async getLimits() {
    const { data, error } = await supabase
      .from('environmental_limits')
      .select('*')
      .eq('is_active', true);
    
    if (error) throw error;
    return data as EnvironmentalLimit[];
  },

  async updateLimit(id: string, updates: Partial<EnvironmentalLimit>) {
    const { data, error } = await supabase
      .from('environmental_limits')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as EnvironmentalLimit;
  },

  async createLimit(limit: Partial<EnvironmentalLimit>) {
    const { data, error } = await supabase
      .from('environmental_limits')
      .insert([limit])
      .select()
      .single();
    
    if (error) throw error;
    return data as EnvironmentalLimit;
  }
};
