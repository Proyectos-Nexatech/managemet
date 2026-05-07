import { useState } from 'react';
import { Plus, Trash2, Save, Loader2, Building } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '@/components/ui/button';
import { traceabilityService, type ExternalLaboratory } from '../../services/traceability';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  labs: ExternalLaboratory[];
  onSaved: () => void;
}

const empty = { name: '', accreditation_number: '', accrediting_body: 'ONAC', country: 'Colombia', inm_reference: '', contact_email: '' };

export function LabModal({ isOpen, onClose, labs, onSaved }: Props) {
  const [form, setForm] = useState<Partial<ExternalLaboratory>>(empty);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await traceabilityService.createLaboratory(form);
      setForm(empty);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('¿Desactivar este laboratorio?')) return;
    await traceabilityService.updateLaboratory(id, { is_active: false });
    onSaved();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Laboratorios Externos / Entes Calibradores" maxWidthClass="max-w-2xl">
      <div className="p-6 space-y-6">
        {/* Existing labs */}
        {labs.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registrados</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {labs.map(lab => (
                <div key={lab.id} className="flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-sm font-black text-slate-800">{lab.name}</p>
                    <p className="text-[10px] font-bold text-slate-400">
                      {lab.accrediting_body} · {lab.accreditation_number || 'Sin No. acreditación'}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-red-400 hover:text-red-600" onClick={() => handleDeactivate(lab.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add new */}
        <form onSubmit={handleSave} className="space-y-4 border-t border-slate-50 pt-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agregar Laboratorio</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Laboratorio *</label>
              <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5"
                value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ente Acreditador</label>
              <select className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5"
                value={form.accrediting_body || 'ONAC'} onChange={e => setForm({ ...form, accrediting_body: e.target.value })}>
                <option>ONAC</option><option>IDEAM</option><option>SIC</option><option>ILAC</option><option>A2LA</option><option>Otro</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No. Acreditación</label>
              <input className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5"
                value={form.accreditation_number || ''} onChange={e => setForm({ ...form, accreditation_number: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Referencia INM / Patrón Nacional</label>
              <input className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5"
                placeholder="Ej: SIC Colombia - INM-T-001"
                value={form.inm_reference || ''} onChange={e => setForm({ ...form, inm_reference: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={onClose} className="rounded-2xl font-bold text-slate-400">Cerrar</Button>
            <Button type="submit" disabled={saving} className="rounded-2xl font-black bg-primary text-white px-6 shadow-lg shadow-primary/20">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Agregar
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
