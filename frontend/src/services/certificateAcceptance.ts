import { supabase } from '../lib/supabase';

export interface AcceptanceChecklistItem {
  id: string;
  acceptance_id: string;
  item_number: number;
  description: string;
  is_critical: boolean;
  result: 'SI' | 'NO' | 'NA';
}

export interface CertificateAcceptance {
  id: string;
  equipment_id: string;
  provider: string;
  certificate_number: string;
  calibration_date: string;
  evaluation_date: string;
  evaluated_by: string;
  status: 'pending' | 'accepted' | 'rejected';
  observations: string | null;
  created_at: string;
  equipment?: { name: string; internal_id: string };
  evaluator?: { full_name: string };
  checklist?: AcceptanceChecklistItem[];
}

export const certificateAcceptanceService = {
  async getAll(equipmentId?: string) {
    let query = supabase
      .from('certificate_acceptances')
      .select(`
        *,
        equipment:equipment(name, internal_id),
        evaluator:user_profiles(full_name)
      `)
      .order('created_at', { ascending: false });

    if (equipmentId) {
      query = query.eq('equipment_id', equipmentId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as CertificateAcceptance[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('certificate_acceptances')
      .select(`
        *,
        equipment:equipment(name, internal_id),
        evaluator:user_profiles(full_name),
        checklist:acceptance_checklist_items(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as CertificateAcceptance;
  },

  async create(acceptance: Partial<CertificateAcceptance>) {
    const { data, error } = await supabase
      .from('certificate_acceptances')
      .insert([acceptance])
      .select()
      .single();

    if (error) throw error;

    // Initialize checklist with 20 items
    const checklistItems = [
      { num: 1, desc: 'Identificación correcta del ítem calibrado', critical: true },
      { num: 2, desc: 'Trazabilidad metrológica declarada', critical: true },
      { num: 3, desc: 'Incertidumbre de medición reportada', critical: true },
      { num: 4, desc: 'Información del laboratorio (nombre, dirección)', critical: false },
      { num: 5, desc: 'Número único de certificado', critical: false },
      { num: 6, desc: 'Fecha de calibración', critical: false },
      { num: 7, desc: 'Resultados con unidades SI', critical: true },
      { num: 8, desc: 'Método de calibración referenciado', critical: true },
      { num: 9, desc: 'Condiciones ambientales registradas', critical: false },
      { num: 10, desc: 'Declaración de conformidad (si aplica)', critical: false },
      { num: 11, desc: 'Firma del responsable técnico', critical: false },
      { num: 12, desc: 'Acreditación del laboratorio vigente', critical: false },
      { num: 13, desc: 'Alcance cubre la magnitud calibrada', critical: false },
      { num: 14, desc: 'Factor de cobertura (k) declarado', critical: false },
      { num: 15, desc: 'Correcciones aplicadas documentadas', critical: false },
      { num: 16, desc: 'Página x de y en todas las hojas', critical: false },
      { num: 17, desc: 'Sin tachaduras o alteraciones', critical: false },
      { num: 18, desc: 'Equipo patrón utilizado identificado', critical: false },
      { num: 19, desc: 'Intervalos de calibración del patrón vigentes', critical: false },
      { num: 20, desc: 'Observaciones o notas relevantes', critical: false },
    ].map(item => ({
      acceptance_id: data.id,
      item_number: item.num,
      description: item.desc,
      is_critical: item.critical,
      result: 'NA' as const
    }));

    const { error: checklistError } = await supabase
      .from('acceptance_checklist_items')
      .insert(checklistItems);

    if (checklistError) throw checklistError;

    return data as CertificateAcceptance;
  },

  async updateChecklistItem(id: string, result: 'SI' | 'NO' | 'NA') {
    const { error } = await supabase
      .from('acceptance_checklist_items')
      .update({ result })
      .eq('id', id);
    if (error) throw error;
  },

  async evaluateAcceptance(id: string, observations?: string) {
    const { data: checklist, error: checklistError } = await supabase
      .from('acceptance_checklist_items')
      .select('*')
      .eq('acceptance_id', id);

    if (checklistError) throw checklistError;

    const hasCriticalFailure = checklist.some(item => item.is_critical && item.result === 'NO');
    const status = hasCriticalFailure ? 'rejected' : 'accepted';

    const { error } = await supabase
      .from('certificate_acceptances')
      .update({ status, observations: observations || null })
      .eq('id', id);

    if (error) throw error;
    return status;
  },

  async getAcceptedForEquipment(equipmentId: string) {
    const { data, error } = await supabase
      .from('certificate_acceptances')
      .select('*')
      .eq('equipment_id', equipmentId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as CertificateAcceptance[];
  }
};
