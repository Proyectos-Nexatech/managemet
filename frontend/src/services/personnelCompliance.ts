import { supabase } from '../lib/supabase';

export interface PersonnelAuthorization {
  id: string;
  personnel_id: string;
  authorized_activity: string;
  scope: string | null;
  authorized_by: string;
  authorization_date: string;
  expiry_date: string | null;
  document_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PersonnelSupervision {
  id: string;
  personnel_id: string;
  supervisor_name: string;
  supervision_date: string;
  activity_supervised: string;
  result: 'satisfactory' | 'needs_improvement' | 'unsatisfactory';
  observations: string | null;
  corrective_action: string | null;
  next_supervision_date: string | null;
  document_url: string | null;
  created_at: string;
}

export const personnelComplianceService = {
  // Authorizations
  async getAuthorizations(personnelId: string) {
    const { data, error } = await supabase
      .from('personnel_authorizations')
      .select('*')
      .eq('personnel_id', personnelId)
      .order('authorization_date', { ascending: false });
    if (error) throw error;
    return data as PersonnelAuthorization[];
  },

  async createAuthorization(auth: Partial<PersonnelAuthorization>) {
    const { data, error } = await supabase
      .from('personnel_authorizations')
      .insert([auth])
      .select()
      .single();
    if (error) throw error;
    return data as PersonnelAuthorization;
  },

  async updateAuthorization(id: string, updates: Partial<PersonnelAuthorization>) {
    const { data, error } = await supabase
      .from('personnel_authorizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as PersonnelAuthorization;
  },

  async deleteAuthorization(id: string) {
    const { error } = await supabase
      .from('personnel_authorizations')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Supervisions
  async getSupervisions(personnelId: string) {
    const { data, error } = await supabase
      .from('personnel_supervision')
      .select('*')
      .eq('personnel_id', personnelId)
      .order('supervision_date', { ascending: false });
    if (error) throw error;
    return data as PersonnelSupervision[];
  },

  async createSupervision(supervision: Partial<PersonnelSupervision>) {
    const { data, error } = await supabase
      .from('personnel_supervision')
      .insert([supervision])
      .select()
      .single();
    if (error) throw error;
    return data as PersonnelSupervision;
  },

  async deleteSupervision(id: string) {
    const { error } = await supabase
      .from('personnel_supervision')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Storage
  async uploadComplianceDocument(personnelId: string, file: File, type: 'auth' | 'supervision') {
    const fileName = `${type}/${personnelId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage
      .from('managemet_assets')
      .upload(fileName, file);
    if (error) throw error;

    const { data } = supabase.storage
      .from('managemet_assets')
      .getPublicUrl(fileName);
    return data.publicUrl;
  }
};
