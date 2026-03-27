import { supabase } from '../lib/supabase';

export interface ResultReport {
  id: string;
  report_code: string;
  type: 'calibration_certificate' | 'test_report' | 'complementary';
  calibration_id: string | null;
  equipment_id: string | null;
  client_name: string | null;
  item_description: string;
  method_id: string | null;
  status: 'draft' | 'review' | 'approved' | 'issued' | 'amended' | 'cancelled';
  issue_date: string | null;
  approved_by: string | null;
  reviewed_by: string | null;
  results_data: any;
  uncertainty_statement: string | null;
  conformity_statement: string | null;
  observations: string | null;
  document_url: string | null;
  created_at: string;
}

export const resultReportService = {
  async getAll() {
    const { data, error } = await supabase
      .from('result_reports')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as ResultReport[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('result_reports')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as ResultReport;
  },

  async create(report: Partial<ResultReport>) {
    // Generate code INF-YYYY-NNN
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('result_reports')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${year}-01-01`);
    
    const countFormatted = String((count || 0) + 1).padStart(3, '0');
    const report_code = `INF-${year}-${countFormatted}`;

    const { data, error } = await supabase
      .from('result_reports')
      .insert([{ ...report, report_code }])
      .select()
      .single();
    
    if (error) throw error;
    return data as ResultReport;
  },

  async update(id: string, updates: Partial<ResultReport>) {
    const { data, error } = await supabase
      .from('result_reports')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as ResultReport;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('result_reports')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
