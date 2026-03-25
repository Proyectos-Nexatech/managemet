-- ==============================================================================
-- MODULE: CONFIGURACIÓN DE CARGOS Y PERFILES (ISO 17025)
-- ==============================================================================

-- 1. TABLA DE CARGOS (JOB POSITIONS)
CREATE TABLE IF NOT EXISTS job_positions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    department text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. TABLA DE PERFILES DE CARGO (COMPETENCIAS REQUERIDAS)
CREATE TYPE competency_level AS ENUM ('basic', 'intermediate', 'expert');

CREATE TABLE IF NOT EXISTS job_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_position_id uuid REFERENCES job_positions(id) ON DELETE CASCADE,
    competency_id uuid REFERENCES competencies(id) ON DELETE CASCADE,
    required_level competency_level NOT NULL DEFAULT 'basic',
    is_mandatory boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    UNIQUE(job_position_id, competency_id)
);

-- 3. TABLA DE REQUISITOS EDUCATIVOS/FORMATIVOS (6.2 ISO 17025)
CREATE TYPE education_req_type AS ENUM ('degree', 'course', 'experience', 'other');

CREATE TABLE IF NOT EXISTS education_requirements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_position_id uuid REFERENCES job_positions(id) ON DELETE CASCADE,
    req_type education_req_type NOT NULL,
    description text NOT NULL,
    is_mandatory boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- 4. MODIFICACIÓN A TABLA PERSONNEL EXISTENTE
-- Añadir job_position_id a personnel
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS job_position_id uuid REFERENCES job_positions(id) ON DELETE SET NULL;

-- 5. SEMILLA DE DATOS (CARGOS PREDEFINIDOS ISO 17025)
INSERT INTO job_positions (name, description, department) VALUES
  ('Director Técnico', 'Responsable técnico del laboratorio (Cláusula 5.2, 6.2.4)', 'Dirección'),
  ('Jefe de Laboratorio', 'Supervisa las operaciones técnicas y evalúa personal (Cláusula 6.2, 8.6)', 'Laboratorio'),
  ('Técnico de Calibración', 'Ejecuta las calibraciones y mantiene equipos (Cláusula 6.2.2)', 'Laboratorio'),
  ('Técnico de Mantenimiento', 'Realiza mantenimientos a los patrones y equipos de medición (Cláusula 6.4)', 'Soporte'),
  ('Gestor de Calidad', 'Asegura el cumplimiento de ISO 17025 (Cláusula 8.2, 8.9)', 'Calidad'),
  ('Analista de Incertidumbre', 'Estima análisis de incertidumbre de medición (Cláusula 7.6)', 'Laboratorio')
ON CONFLICT DO NOTHING;

-- 6. PERMISOS DEL MÓDULO PARA EL ROL ADMIN
INSERT INTO role_permissions (role_id, module, can_read, can_create, can_update, can_delete)
SELECT (SELECT id FROM roles WHERE name = 'admin'), 'config_cargos', true, true, true, true
ON CONFLICT DO NOTHING;
