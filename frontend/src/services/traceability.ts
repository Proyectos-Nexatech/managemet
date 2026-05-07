import { supabase } from '../lib/supabase';
import { type Magnitude } from './magnitudes';

export type TraceabilityLevel =
  | 'INM'
  | 'Patrón Nacional'
  | 'Patrón de Referencia'
  | 'Patrón de Trabajo'
  | 'Equipo de Trabajo';

export interface ExternalLaboratory {
  id: string;
  name: string;
  accreditation_number: string | null;
  accrediting_body: string | null;
  country: string;
  inm_reference: string | null;
  website_url: string | null;
  contact_email: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TraceableEquipment {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  internal_id: string | null;
  status: string;
  magnitude_id: string;
  magnitude?: Magnitude;
  classification: string | null;
  traceability_level: TraceabilityLevel | null;

  // Traceability hierarchy
  parent_equipment_id: string | null;
  parent_equipment?: TraceableEquipment;

  // Certificate fields
  calibrating_lab_id: string | null;
  calibrating_lab?: ExternalLaboratory;
  certificate_number: string | null;
  certificate_date: string | null;
  certificate_expiry: string | null;
  expanded_uncertainty: number | null;
  coverage_factor: number | null;
  certificate_url: string | null;
  is_external: boolean;
}


export interface TraceabilityNode {
  id: string;
  equipment: TraceableEquipment;
  children: TraceabilityNode[];
  depth: number;
  // Validation state
  isExpired: boolean;
  isMagnitudeMismatch: boolean;
  uncertaintyWarning: boolean;
}

export const traceabilityService = {
  // Get all equipment with traceability data
  async getAll(): Promise<TraceableEquipment[]> {
    const { data, error } = await supabase
      .from('equipment')
      .select(`
        id, name, brand, model, serial_number, internal_id, status,
        magnitude_id, magnitude:magnitudes(id, name),
        classification, traceability_level,
        parent_equipment_id,
        calibrating_lab_id, calibrating_lab:external_laboratories(id, name, accreditation_number, accrediting_body),
        certificate_number, certificate_date, certificate_expiry,
        expanded_uncertainty, coverage_factor, certificate_url, is_external
      `)
      .order('name');
    if (error) throw error;
    return data as TraceableEquipment[];
  },

  // Get root equipment (no parent = top of the chain)
  async getRoots(): Promise<TraceableEquipment[]> {
    const { data, error } = await supabase
      .from('equipment')
      .select(`
        id, name, brand, model, serial_number, internal_id, status,
        magnitude_id, magnitude:magnitudes(id, name),
        classification, traceability_level,
        parent_equipment_id,
        calibrating_lab_id, calibrating_lab:external_laboratories(id, name, accreditation_number, accrediting_body),
        certificate_number, certificate_date, certificate_expiry,
        expanded_uncertainty, coverage_factor, certificate_url, is_external
      `)
      .is('parent_equipment_id', null)
      .order('name');
    if (error) throw error;
    return data as TraceableEquipment[];
  },


  // Build a full traceability tree starting from a root equipment
  buildTree(all: TraceableEquipment[], rootId: string | null = null, depth = 0): TraceabilityNode[] {
    const today = new Date();
    const children = all.filter(eq =>
      rootId === null ? eq.parent_equipment_id === null : eq.parent_equipment_id === rootId
    );

    return children.map(eq => {
      const expiry = eq.certificate_expiry ? new Date(eq.certificate_expiry) : null;
      const parent = rootId ? all.find(e => e.id === rootId) : null;

      const isExpired = expiry ? expiry < today : false;
      const isMagnitudeMismatch = parent
        ? eq.magnitude_id !== parent.magnitude_id
        : false;
      const uncertaintyWarning =
        parent?.expanded_uncertainty != null && eq.expanded_uncertainty != null
          ? parent.expanded_uncertainty >= eq.expanded_uncertainty
          : false;

      return {
        id: eq.id,
        equipment: eq,
        depth,
        isExpired,
        isMagnitudeMismatch,
        uncertaintyWarning,
        children: traceabilityService.buildTree(all, eq.id, depth + 1),
      };
    });
  },

  // Get labs
  async getLaboratories(): Promise<ExternalLaboratory[]> {
    const { data, error } = await supabase
      .from('external_laboratories')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data as ExternalLaboratory[];
  },

  async createLaboratory(lab: Partial<ExternalLaboratory>): Promise<ExternalLaboratory> {
    const { data, error } = await supabase
      .from('external_laboratories')
      .insert([lab])
      .select()
      .single();
    if (error) throw error;
    return data as ExternalLaboratory;
  },

  async updateLaboratory(id: string, updates: Partial<ExternalLaboratory>): Promise<ExternalLaboratory> {
    const { data, error } = await supabase
      .from('external_laboratories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as ExternalLaboratory;
  },

  // Update traceability fields on equipment
  async updateEquipmentTraceability(id: string, updates: Partial<TraceableEquipment>): Promise<void> {
    const { error } = await supabase
      .from('equipment')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },

  // Upload certificate PDF to storage
  async uploadCertificate(equipmentId: string, file: File): Promise<string> {
    const fileName = `certificates/${equipmentId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage
      .from('managemet_assets')
      .upload(fileName, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage
      .from('managemet_assets')
      .getPublicUrl(fileName);
    return data.publicUrl;
  },

  // Create an external reference patron (not in internal inventory)
  async createExternalPatron(patron: {
    name: string;
    internal_id?: string;
    serial_number?: string;
    last_calibration_date?: string;
    calibrating_lab_id?: string;
    traceability_level?: string;
    magnitude_id?: string;
  }): Promise<TraceableEquipment> {
    const { data, error } = await supabase
      .from('equipment')
      .insert([{
        name: patron.name,
        internal_id: patron.internal_id || null,
        serial_number: patron.serial_number || null,
        last_calibration_date: patron.last_calibration_date || null,
        calibrating_lab_id: patron.calibrating_lab_id || null,
        traceability_level: patron.traceability_level || 'Patrón de Referencia',
        magnitude_id: patron.magnitude_id || null,
        classification: 'Equipo de Referencia',
        is_external: true,
        status: 'active',
        calibration_period_days: 365,
      }])
      .select('id, name, brand, model, serial_number, internal_id, status, magnitude_id, classification, traceability_level, parent_equipment_id, calibrating_lab_id, certificate_number, certificate_date, certificate_expiry, expanded_uncertainty, coverage_factor, certificate_url, is_external')
      .single();

    if (error) throw error;
    return data as TraceableEquipment;
  },

  // Detect cycles to prevent circular references
  wouldCreateCycle(all: TraceableEquipment[], equipmentId: string, newParentId: string): boolean {
    let current: TraceableEquipment | undefined = all.find(e => e.id === newParentId);
    while (current) {
      if (current.id === equipmentId) return true;
      current = all.find(e => e.id === current!.parent_equipment_id);
    }
    return false;
  },
};
