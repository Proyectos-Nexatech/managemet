import { supabase } from '../lib/supabase';
import { type Competency } from './personnel';

export interface JobPosition {
  id: string;
  name: string;
  description: string | null;
  department: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface JobProfile {
  id: string;
  job_position_id: string;
  competency_id: string;
  required_level: 'basic' | 'intermediate' | 'expert';
  is_mandatory: boolean;
  competency?: Competency;
}

export interface EducationRequirement {
  id: string;
  job_position_id: string;
  req_type: 'degree' | 'course' | 'experience' | 'other';
  description: string;
  is_mandatory: boolean;
}

export const jobPositionsService = {
  // Job Positions CRUD
  async getJobPositions() {
    const { data, error } = await supabase
      .from('job_positions')
      .select('*')
      .order('name');
    if (error) throw error;
    return data as JobPosition[];
  },

  async createJobPosition(position: Partial<JobPosition>) {
    const { data, error } = await supabase.from('job_positions').insert([position]).select().single();
    if (error) throw error;
    return data as JobPosition;
  },

  async updateJobPosition(id: string, updates: Partial<JobPosition>) {
    const { data, error } = await supabase.from('job_positions').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as JobPosition;
  },

  async deleteJobPosition(id: string) {
    const { error } = await supabase.from('job_positions').delete().eq('id', id);
    if (error) throw error;
  },

  // Job Profiles (Competencies)
  async getJobProfiles(jobPositionId: string) {
    const { data, error } = await supabase
      .from('job_profiles')
      .select('*, competency:competencies(*, magnitude:magnitudes(name))')
      .eq('job_position_id', jobPositionId);
    if (error) throw error;
    return data as JobProfile[];
  },

  async saveJobProfile(profile: Partial<JobProfile>) {
    const { data, error } = await supabase
      .from('job_profiles')
      .upsert({ 
        job_position_id: profile.job_position_id, 
        competency_id: profile.competency_id, 
        required_level: profile.required_level,
        is_mandatory: profile.is_mandatory
      }, { onConflict: 'job_position_id, competency_id' })
      .select()
      .single();
    if (error) throw error;
    return data as JobProfile;
  },

  async deleteJobProfile(id: string) {
    const { error } = await supabase.from('job_profiles').delete().eq('id', id);
    if (error) throw error;
  },

  // Education Requirements
  async getEducationRequirements(jobPositionId: string) {
    const { data, error } = await supabase
      .from('education_requirements')
      .select('*')
      .eq('job_position_id', jobPositionId)
      .order('created_at');
    if (error) throw error;
    return data as EducationRequirement[];
  },

  async createEducationRequirement(req: Partial<EducationRequirement>) {
    const { data, error } = await supabase.from('education_requirements').insert([req]).select().single();
    if (error) throw error;
    return data as EducationRequirement;
  },

  async deleteEducationRequirement(id: string) {
    const { error } = await supabase.from('education_requirements').delete().eq('id', id);
    if (error) throw error;
  }
};
