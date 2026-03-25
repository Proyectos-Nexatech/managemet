import { supabase } from '../lib/supabase';
import { type Equipment } from './equipment';

export interface CalibrationScheduleItem {
  id: string;
  equipment_id: string;
  scheduled_date: string;
  type: 'manual' | 'automatic' | 'semi-automatic';
  status: 'scheduled' | 'completed' | 'cancelled' | 'overdue';
  work_order_no: string | null;
  notes: string | null;
  equipment?: Equipment;
  created_at: string;
}

export const scheduleService = {
  async getSchedule() {
    const { data, error } = await supabase
      .from('calibration_schedule')
      .select('*, equipment:equipment(*)')
      .order('scheduled_date', { ascending: true });
    
    if (error) throw error;
    return data as CalibrationScheduleItem[];
  },

  async createScheduleItem(item: Partial<CalibrationScheduleItem>) {
    const { data, error } = await supabase
      .from('calibration_schedule')
      .insert([item])
      .select()
      .single();
    
    if (error) throw error;
    return data as CalibrationScheduleItem;
  },

  async updateScheduleItem(id: string, updates: Partial<CalibrationScheduleItem>) {
    const { data, error } = await supabase
      .from('calibration_schedule')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as CalibrationScheduleItem;
  },

  async deleteScheduleItem(id: string) {
    const { error } = await supabase
      .from('calibration_schedule')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
