import { useState, useEffect, useRef } from 'react';
import { Save, Loader2, Upload, AlertTriangle, Plus, X, Building2 } from 'lucide-react';

import { Modal } from '../ui/Modal';
import { Button } from '@/components/ui/button';
import { traceabilityService, type TraceableEquipment, type ExternalLaboratory } from '../../services/traceability';
import clsx from 'clsx';


const LEVELS = ['INM', 'Patrón Nacional', 'Patrón de Referencia', 'Patrón de Trabajo', 'Equipo de Trabajo'] as const;
const EXTERNAL_PATRON_VALUE = '__NEW_EXTERNAL__';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  allEquipment: TraceableEquipment[];
  labs: ExternalLaboratory[];
  initialEquipment: TraceableEquipment | null;
  onSaved: () => void;
}

interface ExternalPatronForm {

  name: string;
  internal_id: string;
  serial_number: string;
  last_calibration_date: string;
  calibrating_lab_id: string;
  traceability_level: string;
}

const emptyExternalPatron: ExternalPatronForm = {
  name: '',
  internal_id: '',
  serial_number: '',
  last_calibration_date: '',
  calibrating_lab_id: '',
  traceability_level: 'Patrón de Referencia',
};

export function LinkModal({ isOpen, onClose, allEquipment, labs, initialEquipment, onSaved }: Props) {

  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState({
    parent_equipment_id: '',
    calibrating_lab_id: '',
    traceability_level: 'Equipo de Trabajo',
    certificate_number: '',
    certificate_date: '',
    certificate_expiry: '',
    expanded_uncertainty: '',
    coverage_factor: '2',
    certificate_url: '',
  });
  const [certFile, setCertFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [cycleError, setCycleError] = useState(false);
  const [showExternalForm, setShowExternalForm] = useState(false);
  const [externalForm, setExternalForm] = useState<ExternalPatronForm>(emptyExternalPatron);
  const [creatingExternal, setCreatingExternal] = useState(false);
  const [createdExternalId, setCreatedExternalId] = useState<string | null>(null);
  const [createdExternalName, setCreatedExternalName] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialEquipment) setSelectedId(initialEquipment.id);
  }, [initialEquipment]);

  const selectedEq = allEquipment.find(e => e.id === selectedId);

  const handleParentChange = (val: string) => {
    if (val === EXTERNAL_PATRON_VALUE) {
      setShowExternalForm(true);
      setForm(f => ({ ...f, parent_equipment_id: '' }));
      return;
    }
    if (val && selectedId && traceabilityService.wouldCreateCycle(allEquipment, selectedId, val)) {
      setCycleError(true);
    } else {
      setCycleError(false);
    }
    setForm(f => ({ ...f, parent_equipment_id: val }));
  };

  const handleCreateExternalPatron = async () => {
    if (!externalForm.name.trim()) return;
    try {
      setCreatingExternal(true);
      const created = await traceabilityService.createExternalPatron({
        name: externalForm.name,
        internal_id: externalForm.internal_id,
        serial_number: externalForm.serial_number,
        last_calibration_date: externalForm.last_calibration_date || undefined,
        calibrating_lab_id: externalForm.calibrating_lab_id || undefined,
        traceability_level: externalForm.traceability_level,
      });
      setCreatedExternalId(created.id);
      setCreatedExternalName(created.name);
      setForm(f => ({ ...f, parent_equipment_id: created.id }));
      setShowExternalForm(false);
      setExternalForm(emptyExternalPatron);
      // Refresh equipment list in parent
      onSaved();
    } finally {
      setCreatingExternal(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || cycleError) return;
    try {
      setSaving(true);
      let certUrl = form.certificate_url;
      if (certFile) certUrl = await traceabilityService.uploadCertificate(selectedId, certFile);

      await traceabilityService.updateEquipmentTraceability(selectedId, {
        parent_equipment_id: form.parent_equipment_id || null,
        calibrating_lab_id: form.calibrating_lab_id || null,
        traceability_level: form.traceability_level as any,
        certificate_number: form.certificate_number || null,
        certificate_date: form.certificate_date || null,
        certificate_expiry: form.certificate_expiry || null,
        expanded_uncertainty: form.expanded_uncertainty ? parseFloat(form.expanded_uncertainty) : null,
        coverage_factor: form.coverage_factor ? parseFloat(form.coverage_factor) : null,
        certificate_url: certUrl || null,
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (selectedEq) {
      setForm({
        parent_equipment_id: selectedEq.parent_equipment_id || '',
        calibrating_lab_id: selectedEq.calibrating_lab_id || '',
        traceability_level: selectedEq.traceability_level || 'Equipo de Trabajo',
        certificate_number: selectedEq.certificate_number || '',
        certificate_date: selectedEq.certificate_date || '',
        certificate_expiry: selectedEq.certificate_expiry || '',
        expanded_uncertainty: selectedEq.expanded_uncertainty?.toString() || '',
        coverage_factor: selectedEq.coverage_factor?.toString() || '2',
        certificate_url: selectedEq.certificate_url || '',
      });
      setCreatedExternalId(null);
      setCreatedExternalName('');
    }
  }, [selectedId]);

  const inputCls = "w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all";
  const labelCls = "text-[10px] font-black text-slate-400 uppercase tracking-widest";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configurar Trazabilidad de Equipo" maxWidthClass="max-w-2xl">
      <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
        {/* Equipment selector */}
        <div className="space-y-1">
          <label className={labelCls}>Equipo a Configurar *</label>
          <select required className={inputCls} value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            <option value="">— Seleccionar equipo —</option>
            {allEquipment.filter(e => !e.is_external).map(eq => (
              <option key={eq.id} value={eq.id}>{eq.name} {eq.serial_number ? `· S/N ${eq.serial_number}` : ''}</option>
            ))}
          </select>
        </div>

        {selectedId && (
          <>
            <div className="grid grid-cols-2 gap-4">
              {/* Level */}
              <div className="space-y-1">
                <label className={labelCls}>Nivel de Trazabilidad</label>
                <select className={inputCls} value={form.traceability_level}
                  onChange={e => setForm(f => ({ ...f, traceability_level: e.target.value }))}>
                  {LEVELS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>

              {/* Parent / Patron */}
              <div className="space-y-1">
                <label className={labelCls}>Patrón Directo (Padre)</label>

                {/* Show tag if external patron was just created */}
                {createdExternalId ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-3 bg-green-50 border border-green-200 rounded-2xl text-sm font-bold text-green-700 truncate">
                      ✅ {createdExternalName}
                    </div>
                    <button type="button" onClick={() => { setCreatedExternalId(null); setCreatedExternalName(''); setForm(f => ({ ...f, parent_equipment_id: '' })); }}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <select
                    className={clsx(inputCls, cycleError && 'border-red-300 ring-2 ring-red-200')}
                    value={form.parent_equipment_id}
                    onChange={e => handleParentChange(e.target.value)}
                  >
                    <option value="">— Sin patrón (raíz) —</option>
                    <option value={EXTERNAL_PATRON_VALUE} className="text-primary font-bold">
                      ➕ Agregar patrón externo nuevo...
                    </option>
                    
                    <optgroup label="Inventario Interno">
                      {allEquipment.filter(e => e.id !== selectedId && !e.is_external).map(eq => (
                        <option key={eq.id} value={eq.id}>{eq.name}{eq.serial_number ? ` · ${eq.serial_number}` : ''}</option>
                      ))}
                    </optgroup>

                    <optgroup label="Patrones Externos Registrados">
                      {allEquipment.filter(e => e.id !== selectedId && e.is_external).map(eq => (
                        <option key={eq.id} value={eq.id}>{eq.name}{eq.serial_number ? ` · ${eq.serial_number}` : ''}</option>
                      ))}
                    </optgroup>
                  </select>
                )}


                {cycleError && (
                  <p className="flex items-center gap-1 text-[10px] font-bold text-red-500">
                    <AlertTriangle className="w-3 h-3" />Referencia circular detectada
                  </p>
                )}
              </div>
            </div>

            {/* ── EXTERNAL PATRON INLINE FORM ── */}
            {showExternalForm && (
              <div className="rounded-[1.5rem] border-2 border-dashed border-primary/30 bg-primary/3 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <p className="text-xs font-black text-primary uppercase tracking-widest">Nuevo Patrón Externo</p>
                  </div>
                  <button type="button" onClick={() => { setShowExternalForm(false); }}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <label className={labelCls}>Descripción / Nombre del Patrón *</label>
                    <input
                      className={inputCls} required={showExternalForm}
                      placeholder="Ej: Patrón Manómetro Digital WIKA"
                      value={externalForm.name}
                      onChange={e => setExternalForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Código / ID</label>
                    <input className={inputCls} placeholder="Ej: PAT-001"
                      value={externalForm.internal_id}
                      onChange={e => setExternalForm(f => ({ ...f, internal_id: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Número de Serie</label>
                    <input className={inputCls} placeholder="Ej: SN-XYZ-2024"
                      value={externalForm.serial_number}
                      onChange={e => setExternalForm(f => ({ ...f, serial_number: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Nivel de Trazabilidad</label>
                    <select className={inputCls} value={externalForm.traceability_level}
                      onChange={e => setExternalForm(f => ({ ...f, traceability_level: e.target.value }))}>
                      {LEVELS.filter(l => l !== 'Equipo de Trabajo').map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Fecha de Calibración</label>
                    <input type="date" className={inputCls}
                      value={externalForm.last_calibration_date}
                      onChange={e => setExternalForm(f => ({ ...f, last_calibration_date: e.target.value }))} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className={labelCls}>Laboratorio / Empresa Calibradora</label>
                    <select className={inputCls} value={externalForm.calibrating_lab_id}
                      onChange={e => setExternalForm(f => ({ ...f, calibrating_lab_id: e.target.value }))}>
                      <option value="">— Seleccionar laboratorio —</option>
                      {labs.map(l => <option key={l.id} value={l.id}>{l.name}{l.accreditation_number ? ` (${l.accreditation_number})` : ''}</option>)}
                    </select>
                    {labs.length === 0 && (
                      <p className="text-[10px] font-bold text-amber-500 mt-1">
                        No hay laboratorios registrados. Crea uno primero en "Laboratorios".
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" className="rounded-2xl font-bold text-slate-400 h-9"
                    onClick={() => { setShowExternalForm(false); setExternalForm(emptyExternalPatron); }}>
                    Cancelar
                  </Button>
                  <Button type="button" disabled={!externalForm.name || creatingExternal}
                    className="rounded-2xl font-black bg-primary text-white h-9 px-5 shadow-lg shadow-primary/20"
                    onClick={handleCreateExternalPatron}>
                    {creatingExternal
                      ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      : <Plus className="w-4 h-4 mr-2" />}
                    Crear y Vincular Patrón
                  </Button>
                </div>
              </div>
            )}

            {/* ── REST OF THE TRACEABILITY FORM ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className={labelCls}>Laboratorio Calibrador (de este equipo)</label>
                <select className={inputCls} value={form.calibrating_lab_id}
                  onChange={e => setForm(f => ({ ...f, calibrating_lab_id: e.target.value }))}>
                  <option value="">— Interno / No aplica —</option>
                  {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>No. Certificado</label>
                <input className={inputCls} value={form.certificate_number}
                  onChange={e => setForm(f => ({ ...f, certificate_number: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Fecha de Calibración</label>
                <input type="date" className={inputCls} value={form.certificate_date}
                  onChange={e => setForm(f => ({ ...f, certificate_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Vencimiento</label>
                <input type="date" className={inputCls} value={form.certificate_expiry}
                  onChange={e => setForm(f => ({ ...f, certificate_expiry: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Incertidumbre U (±)</label>
                <input type="number" step="any" className={inputCls} value={form.expanded_uncertainty}
                  onChange={e => setForm(f => ({ ...f, expanded_uncertainty: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Factor de Cobertura k</label>
                <input type="number" step="0.1" className={inputCls} value={form.coverage_factor}
                  onChange={e => setForm(f => ({ ...f, coverage_factor: e.target.value }))} />
              </div>
            </div>

            {/* Certificate upload */}
            <div className="space-y-1">
              <label className={labelCls}>Certificado PDF</label>
              <div
                onClick={() => fileRef.current?.click()}
                className={clsx(
                  "w-full h-20 border-2 border-dashed rounded-2xl flex items-center justify-center cursor-pointer transition-all",
                  certFile ? "bg-green-50 border-green-300" : "bg-slate-50 border-slate-200 hover:border-primary/30"
                )}
              >
                <div className="flex items-center gap-3 text-sm font-bold text-slate-400">
                  <Upload className="w-4 h-4" />
                  {certFile ? certFile.name : form.certificate_url ? 'Certificado cargado — clic para reemplazar' : 'Subir certificado PDF'}
                </div>
              </div>
              <input ref={fileRef} type="file" hidden accept=".pdf"
                onChange={e => setCertFile(e.target.files?.[0] || null)} />
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-50">
          <Button variant="ghost" type="button" onClick={onClose} className="rounded-2xl font-bold text-slate-400">Cancelar</Button>
          <Button type="submit" disabled={saving || cycleError || !selectedId || showExternalForm}
            className="rounded-2xl font-black bg-primary text-white px-8 shadow-lg shadow-primary/20">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar Trazabilidad
          </Button>
        </div>
      </form>
    </Modal>
  );
}
