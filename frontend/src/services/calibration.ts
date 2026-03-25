import { supabase } from '../lib/supabase';
import { type Equipment } from './equipment';
import { type Personnel } from './personnel';

export interface Calibration {
  id: string;
  equipment_id: string;
  technician_id: string;
  calibration_date: string;
  next_calibration_date: string | null;
  certificate_no: string;
  result: 'pass' | 'fail' | 'limited';
  uncertainty: string | null;
  status: 'pending' | 'completed' | 'cancelled';
  notes: string | null;
  equipment?: Equipment;
  technician?: Personnel;
}

export const calibrationService = {
  async getCalibrations() {
    const { data, error } = await supabase
      .from('calibrations')
      .select('*, equipment:equipment(*), technician:personnel(*)')
      .order('calibration_date', { ascending: false });
    
    if (error) throw error;
    return data as Calibration[];
  },

  async createCalibration(calibration: Partial<Calibration>) {
    const { data, error } = await supabase
      .from('calibrations')
      .insert([calibration])
      .select()
      .single();
    
    if (error) throw error;
    return data as Calibration;
  },

  async updateCalibration(id: string, updates: Partial<Calibration>) {
    const { data, error } = await supabase
      .from('calibrations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Calibration;
  }
};
