import { supabase } from '../lib/supabase';

export interface Magnitude {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export const magnitudesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('magnitudes')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data as Magnitude[];
  },

  async create(magnitude: Partial<Magnitude>) {
    const { data, error } = await supabase
      .from('magnitudes')
      .insert([magnitude])
      .select()
      .single();
    
    if (error) throw error;
    return data as Magnitude;
  },

  async update(id: string, updates: Partial<Magnitude>) {
    const { data, error } = await supabase
      .from('magnitudes')
      .update(updates)
      .match({ id })
      .select()
      .single();
    
    if (error) throw error;
    return data as Magnitude;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('magnitudes')
      .delete()
      .match({ id });
    
    if (error) throw error;
  }
};
