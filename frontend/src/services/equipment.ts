import { supabase } from '../lib/supabase';
import { type Magnitude } from './magnitudes';

export interface Equipment {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  internal_id: string | null;
  mpe: number | null;
  status: 'active' | 'out_of_service' | 'maintenance' | 'pending_calibration';
  magnitude_id: string;
  magnitude?: Magnitude;
  calibration_period_days: number;
  last_calibration_date: string | null;
  image_url: string | null;
  created_at: string;
}

export const equipmentService = {
  async getAll() {
    const { data, error } = await supabase
      .from('equipment')
      .select('*, magnitude:magnitudes(name)')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data as Equipment[];
  },

  async create(equipment: Partial<Equipment>) {
    const { data, error } = await supabase
      .from('equipment')
      .insert([equipment])
      .select()
      .single();
    
    if (error) throw error;
    return data as Equipment;
  },

  async update(id: string, updates: Partial<Equipment>) {
    const { data, error } = await supabase
      .from('equipment')
      .update(updates)
      .match({ id })
      .select()
      .single();
    
    if (error) throw error;
    return data as Equipment;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('equipment')
      .delete()
      .match({ id });
    
    if (error) throw error;
  },

  async uploadImage(file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `equipment/${fileName}`;

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
