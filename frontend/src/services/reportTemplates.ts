import { supabase } from '../lib/supabase';

export interface ReportTemplate {
  id: string;
  name: string;
  type: 'calibration_certificate' | 'test_report' | 'complementary';
  file_url: string;
  version: string;
  is_active: boolean;
  created_at: string;
}

export const reportTemplateService = {
  async getAll() {
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as ReportTemplate[];
  },

  async upload(name: string, type: string, file: File) {
    // 1. Upload to Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `templates/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    // 2. Save Reference in DB
    const { data, error } = await supabase
      .from('report_templates')
      .insert([{ 
        name, 
        type, 
        file_url: publicUrl,
        version: '1.0'
      }])
      .select()
      .single();

    if (error) throw error;
    return data as ReportTemplate;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('report_templates')
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) throw error;
  }
};
