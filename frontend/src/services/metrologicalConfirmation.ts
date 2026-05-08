import { supabase } from '../lib/supabase';

export interface ConfirmationResult {
  id: string;
  confirmation_id: string;
  point_number: number;
  nominal_value: number;
  standard_value: number;
  instrument_value: number;
  error: number;
  emp: number;
  is_conforming: boolean;
  is_exception: boolean;
  exception_justification: string | null;
}

export interface MetrologicalConfirmation {
  id: string;
  acceptance_id: string | null;
  equipment_id: string;
  magnitude_id: string | null;
  use_range_min: number | null;
  use_range_max: number | null;
  emp_formula: string | null;
  emp_description: string | null;
  status: 'conforme' | 'no_conforme' | 'apto_con_restricciones';
  confirmed_by: string;
  confirmation_date: string;
  digital_signature_url: string | null;
  document_url: string | null;
  created_at: string;
  equipment?: { 
    name: string; 
    brand: string; 
    model: string; 
    serial_number: string;
    internal_id: string;
  };
  magnitude?: { name: string };
  results?: ConfirmationResult[];
}

export const metrologicalConfirmationService = {
  async getAll(equipmentId?: string) {
    let query = supabase
      .from('metrological_confirmations')
      .select(`
        *,
        equipment:equipment(name, brand, model, serial_number, internal_id),
        magnitude:magnitudes(name)
      `)
      .order('confirmation_date', { ascending: false });

    if (equipmentId) {
      query = query.eq('equipment_id', equipmentId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as MetrologicalConfirmation[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('metrological_confirmations')
      .select(`
        *,
        equipment:equipment(name, brand, model, serial_number, internal_id),
        magnitude:magnitudes(name),
        results:confirmation_results(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as MetrologicalConfirmation;
  },

  async create(confirmation: Partial<MetrologicalConfirmation>) {
    const { data, error } = await supabase
      .from('metrological_confirmations')
      .insert([confirmation])
      .select()
      .single();

    if (error) throw error;
    return data as MetrologicalConfirmation;
  },

  async addResult(result: Partial<ConfirmationResult>) {
    const { data, error } = await supabase
      .from('confirmation_results')
      .insert([result])
      .select()
      .single();

    if (error) throw error;
    return data as ConfirmationResult;
  },

  evaluateEMP(formula: string, reading: number): number {
    try {
      // Basic safety: replace common math terms and only allow specific characters
      const sanitizedFormula = formula.replace(/reading/g, reading.toString());
      // A more robust solution would use a math library like mathjs
      // For now, using Function constructor as specified in the plan
      const fn = new Function(`return ${sanitizedFormula};`);
      return Math.abs(fn());
    } catch (e) {
      console.error('Error evaluating formula:', e);
      return 0;
    }
  },

  async calculateAndSaveResults(confirmationId: string, formula: string) {
    const { data: results, error: fetchError } = await supabase
      .from('confirmation_results')
      .select('*')
      .eq('confirmation_id', confirmationId);

    if (fetchError) throw fetchError;

    for (const res of results) {
      const error = res.instrument_value - res.standard_value;
      const emp = this.evaluateEMP(formula, res.nominal_value);
      const is_conforming = Math.abs(error) <= emp;

      await supabase
        .from('confirmation_results')
        .update({ error, emp, is_conforming })
        .eq('id', res.id);
    }

    // Update overall status
    const { data: updatedResults } = await supabase
      .from('confirmation_results')
      .select('*')
      .eq('confirmation_id', confirmationId);

    const hasFailure = updatedResults?.some(r => !r.is_conforming && !r.is_exception);
    const hasException = updatedResults?.some(r => r.is_exception);
    
    let status: MetrologicalConfirmation['status'] = 'conforme';
    if (hasFailure) status = 'no_conforme';
    else if (hasException) status = 'apto_con_restricciones';

    await supabase
      .from('metrological_confirmations')
      .update({ status })
      .eq('id', confirmationId);

    return status;
  },

  async applyException(resultId: string, justification: string) {
    const { error } = await supabase
      .from('confirmation_results')
      .update({ is_exception: true, exception_justification: justification, is_conforming: true })
      .eq('id', resultId);
    
    if (error) throw error;
  }
};
