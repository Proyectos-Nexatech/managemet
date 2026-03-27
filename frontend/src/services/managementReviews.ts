import { supabase } from '../lib/supabase';

export interface ManagementReview {
  id: string;
  code: string;
  title: string;
  review_date: string;
  next_review_date: string | null;
  status: 'planned' | 'in_progress' | 'completed';
  participants: string[];
  period_from: string | null;
  period_to: string | null;
  conclusions: string | null;
  created_by: string;
  created_at: string;
  items?: ReviewAgendaItem[];
}

export interface ReviewAgendaItem {
  id: string;
  review_id: string;
  topic: string;
  iso_clause: string | null;
  input_summary: string | null;
  findings: string | null;
  decisions: string | null;
  action_required: string | null;
  responsible: string | null;
  due_date: string | null;
  sort_order: number;
}

export const managementReviewService = {
  async getAll() {
    const { data, error } = await supabase
      .from('management_reviews')
      .select('*')
      .order('review_date', { ascending: false });
    
    if (error) throw error;
    return data as ManagementReview[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('management_reviews')
      .select('*, items:review_agenda_items(*)')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(review: Partial<ManagementReview>) {
    // Generate code RD-YYYY-NN
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('management_reviews')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${year}-01-01`);
    
    const countFormatted = String((count || 0) + 1).padStart(2, '0');
    const code = `RD-${year}-${countFormatted}`;

    const { data, error } = await supabase
      .from('management_reviews')
      .insert([{ ...review, code }])
      .select()
      .single();
    
    if (error) throw error;
    return data as ManagementReview;
  },

  async update(id: string, updates: Partial<ManagementReview>) {
    const { data, error } = await supabase
      .from('management_reviews')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as ManagementReview;
  },

  async getAgendaItems(reviewId: string) {
    const { data, error } = await supabase
      .from('review_agenda_items')
      .select('*')
      .eq('review_id', reviewId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data as ReviewAgendaItem[];
  },

  async updateAgendaItem(id: string, updates: Partial<ReviewAgendaItem>) {
    const { error } = await supabase
      .from('review_agenda_items')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  }
};
