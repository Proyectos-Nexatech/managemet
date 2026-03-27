import { supabase } from '../lib/supabase';
import { type Magnitude } from './magnitudes';

export interface Personnel {
  id: string;
  name: string;
  role: string;
  area: string;
  status: 'active' | 'inactive';
  job_position_id?: string | null;
}

export interface Competency {
  id: string;
  name: string;
  description: string | null;
  magnitude_id: string | null;
  magnitude?: Magnitude;
}

export interface PersonnelCompetency {
  personnel_id: string;
  competency_id: string;
  level: 'basic' | 'intermediate' | 'expert';
  is_authorized: boolean;
  authorized_by: string | null;
  authorization_date: string | null;
  competency?: Competency;
}

export const personnelService = {
  // Personnel CRUD
  async getPersonnel() {
    const { data, error } = await supabase
      .from('personnel')
      .select('*')
      .order('name');
    if (error) throw error;
    return data as Personnel[];
  },

  async createPersonnel(person: Partial<Personnel>) {
    const { data, error } = await supabase.from('personnel').insert([person]).select().single();
    if (error) throw error;
    return data as Personnel;
  },

  async updatePersonnel(id: string, updates: Partial<Personnel>) {
    const { data, error } = await supabase.from('personnel').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as Personnel;
  },

  async deletePersonnel(id: string) {
    const { error } = await supabase.from('personnel').delete().eq('id', id);
    if (error) throw error;
  },

  // Competency Definitions CRUD
  async getCompetencies() {
    const { data, error } = await supabase
      .from('competencies')
      .select('*, magnitude:magnitudes(name)');
    if (error) throw error;
    return data as Competency[];
  },

  async createCompetency(comp: Partial<Competency>) {
    const { data, error } = await supabase.from('competencies').insert([comp]).select().single();
    if (error) throw error;
    return data as Competency;
  },

  async updateCompetency(id: string, comp: Partial<Competency>) {
    const { data, error } = await supabase.from('competencies').update(comp).eq('id', id).select().single();
    if (error) throw error;
    return data as Competency;
  },

  async deleteCompetency(id: string) {
    const { error } = await supabase.from('competencies').delete().eq('id', id);
    if (error) throw error;
  },

  // Matrix Operations
  async getPersonnelCompetencies(personnelId: string) {
    const { data, error } = await supabase
      .from('personnel_competencies')
      .select('*, competency:competencies(*, magnitude:magnitudes(name))')
      .eq('personnel_id', personnelId);
    if (error) throw error;
    return data as PersonnelCompetency[];
  },

  async updatePersonnelCompetency(personnelId: string, competencyId: string, updates: Partial<PersonnelCompetency>) {
    const { data, error } = await supabase
      .from('personnel_competencies')
      .upsert({ personnel_id: personnelId, competency_id: competencyId, ...updates })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getAllPersonnelCompetencies() {
    const { data, error } = await supabase
      .from('personnel_competencies')
      .select('*');
    if (error) throw error;
    return data as PersonnelCompetency[];
  }
};
