-- 📋 Migración: Módulos de Metrología (R-LAB-4, R-LAB-5, Verificaciones)

-- 1. Aceptación de Certificados (R-LAB-4)
CREATE TABLE certificate_acceptances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    certificate_number TEXT NOT NULL,
    calibration_date DATE NOT NULL,
    evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    evaluated_by UUID REFERENCES user_profiles(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    observations TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Checklist para R-LAB-4
CREATE TABLE acceptance_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    acceptance_id UUID NOT NULL REFERENCES certificate_acceptances(id) ON DELETE CASCADE,
    item_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    is_critical BOOLEAN DEFAULT FALSE,
    result TEXT NOT NULL DEFAULT 'NA' CHECK (result IN ('SI', 'NO', 'NA')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Confirmación Metrológica (R-LAB-5)
CREATE TABLE metrological_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    acceptance_id UUID REFERENCES certificate_acceptances(id) ON DELETE SET NULL,
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    magnitude_id UUID REFERENCES magnitudes(id),
    use_range_min NUMERIC,
    use_range_max NUMERIC,
    emp_formula TEXT, -- Ej: 0.00015 * reading + 0.000007
    emp_description TEXT,
    status TEXT NOT NULL DEFAULT 'conforme' CHECK (status IN ('conforme', 'no_conforme', 'apto_con_restricciones')),
    confirmed_by UUID REFERENCES user_profiles(id),
    confirmation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    digital_signature_url TEXT,
    document_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Resultados detallados para R-LAB-5
CREATE TABLE confirmation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    confirmation_id UUID NOT NULL REFERENCES metrological_confirmations(id) ON DELETE CASCADE,
    point_number INTEGER NOT NULL,
    nominal_value NUMERIC NOT NULL,
    standard_value NUMERIC NOT NULL,
    instrument_value NUMERIC NOT NULL,
    error NUMERIC NOT NULL,
    emp NUMERIC NOT NULL,
    is_conforming BOOLEAN NOT NULL DEFAULT TRUE,
    is_exception BOOLEAN NOT NULL DEFAULT FALSE,
    exception_justification TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Comprobaciones Intermedias
CREATE TABLE intermediate_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    confirmation_id UUID REFERENCES metrological_confirmations(id) ON DELETE SET NULL,
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    check_date DATE,
    next_check_date DATE,
    reference_standard_id UUID REFERENCES equipment(id),
    work_standard_id UUID REFERENCES equipment(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
    performed_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE intermediate_check_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_id UUID NOT NULL REFERENCES intermediate_checks(id) ON DELETE CASCADE,
    point_number INTEGER NOT NULL,
    nominal_value NUMERIC NOT NULL,
    reference_value NUMERIC NOT NULL,
    work_value NUMERIC NOT NULL,
    deviation NUMERIC NOT NULL,
    is_acceptable BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE certificate_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE acceptance_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrological_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE intermediate_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE intermediate_check_results ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso básicas (ajustar según sea necesario)
CREATE POLICY "Allow all for authenticated users" ON certificate_acceptances FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON acceptance_checklist_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON metrological_confirmations FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON confirmation_results FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON intermediate_checks FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON intermediate_check_results FOR ALL TO authenticated USING (true);
