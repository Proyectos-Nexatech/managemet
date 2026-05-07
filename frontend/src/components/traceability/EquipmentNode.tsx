import { memo } from 'react';
import { Handle, Position, type Node } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { AlertTriangle, CheckCircle, FileText, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { type TraceabilityNode } from '../../services/traceability';

interface EquipmentNodeData extends Record<string, unknown> {
  node: TraceabilityNode;
  color: string;
}


export const EquipmentNode = memo(({ data }: NodeProps<Node<EquipmentNodeData>>) => {
  const { node, color } = data;

  const { equipment, isExpired, isMagnitudeMismatch, uncertaintyWarning } = node;

  const hasAlert = isExpired || isMagnitudeMismatch || uncertaintyWarning;
  const expiry = equipment.certificate_expiry
    ? new Date(equipment.certificate_expiry).toLocaleDateString('es-CO')
    : null;

  return (
    <div
      className={clsx(
        'w-64 rounded-[1.5rem] border-2 bg-white shadow-lg transition-all hover:shadow-xl',
        isExpired ? 'border-red-400 bg-red-50' :
        isMagnitudeMismatch ? 'border-amber-400' :
        uncertaintyWarning ? 'border-orange-400' :
        'border-slate-100 hover:border-primary/30'
      )}
    >
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-slate-300 !border-2 !border-white" />

      {/* Level strip */}
      <div
        className="rounded-t-[1.3rem] px-4 py-2 flex items-center justify-between"
        style={{ backgroundColor: color + '18' }}
      >
        <span
          className="text-[9px] font-black uppercase tracking-widest"
          style={{ color }}
        >
          {equipment.traceability_level || 'Sin nivel'}
        </span>
        {hasAlert ? (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        ) : (
          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
        )}
      </div>

      {/* Main content */}
      <div className="px-4 pb-4 pt-2 space-y-2">
        <div>
          <p className="text-sm font-black text-slate-800 leading-tight">{equipment.name}</p>
          {equipment.brand && (
            <p className="text-[10px] font-bold text-slate-400">{equipment.brand} {equipment.model}</p>
          )}
          {equipment.serial_number && (
            <p className="text-[10px] font-bold text-slate-400">S/N: {equipment.serial_number}</p>
          )}
        </div>

        {/* Magnitude */}
        {equipment.magnitude && (
          <div
            className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest w-fit"
            style={{ backgroundColor: color + '15', color }}
          >
            {equipment.magnitude.name}
          </div>
        )}

        {/* Certificate info */}
        {equipment.certificate_number && (
          <div className="space-y-1 pt-1 border-t border-slate-50">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Certificado</p>
            <p className="text-[10px] font-bold text-slate-700">{equipment.certificate_number}</p>
            {equipment.calibrating_lab && (
              <p className="text-[9px] font-bold text-slate-400">
                {equipment.calibrating_lab.name}
                {equipment.calibrating_lab.accreditation_number && (
                  <span className="ml-1 text-primary">({equipment.calibrating_lab.accreditation_number})</span>
                )}
              </p>
            )}
          </div>
        )}

        {/* Uncertainty */}
        {equipment.expanded_uncertainty != null && (
          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
            <span>U = ±{equipment.expanded_uncertainty}</span>
            {equipment.coverage_factor && <span>k = {equipment.coverage_factor}</span>}
          </div>
        )}

        {/* Expiry */}
        {expiry && (
          <div className={clsx(
            'flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg px-2 py-1 w-fit',
            isExpired ? 'bg-red-100 text-red-600' : 'bg-green-50 text-green-600'
          )}>
            {isExpired ? '🔴 Vencido' : '✅ Vigente'} · {expiry}
          </div>
        )}

        {/* Link to certificate */}
        {equipment.certificate_url && (
          <a
            href={equipment.certificate_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[9px] font-black text-primary uppercase tracking-widest hover:underline"
          >
            <FileText className="w-3 h-3" />
            Ver Certificado PDF
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-slate-300 !border-2 !border-white" />
    </div>
  );
});

EquipmentNode.displayName = 'EquipmentNode';
