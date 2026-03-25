-- USER & ROLE MANAGEMENT (RBAC)

-- 1. Roles Table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 2. Role Permissions Table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  module text NOT NULL,
  can_read boolean DEFAULT true,
  can_create boolean DEFAULT false,
  can_update boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  UNIQUE(role_id, module)
);

-- 3. User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  role_id uuid REFERENCES roles(id),
  avatar_url text,
  is_active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 5. Seed Initial Roles and Full Permissions for Admin
-- NOTE: Need to run this manually if trigger/functions not allowed in SQL editor or if using anon key.
-- But usually Supabase SQL Editor allows this.

/*
DO $$
DECLARE
    role_admin_id uuid;
BEGIN
    INSERT INTO roles (name, description, is_system) VALUES ('admin', 'Administrador total', true) ON CONFLICT (name) DO NOTHING;
    INSERT INTO roles (name, description, is_system) VALUES ('jefe_laboratorio', 'Jefe de Lab', false) ON CONFLICT (name) DO NOTHING;
    INSERT INTO roles (name, description, is_system) VALUES ('tecnico', 'Técnico Operativo', false) ON CONFLICT (name) DO NOTHING;
    INSERT INTO roles (name, description, is_system) VALUES ('auditor', 'Auditor de Calidad', false) ON CONFLICT (name) DO NOTHING;
    INSERT INTO roles (name, description, is_system) VALUES ('viewer', 'Solo Lectura', false) ON CONFLICT (name) DO NOTHING;

    SELECT id INTO role_admin_id FROM roles WHERE name = 'admin';

    -- Initial Permissions for Admin
    INSERT INTO role_permissions (role_id, module, can_read, can_create, can_update, can_delete)
    SELECT role_admin_id, m, true, true, true, true
    FROM unnest(ARRAY['dashboard','equipos','calibraciones','documentos','no_conformidades','auditorias','programa','magnitudes','competencias','usuarios']) as modules(m)
    ON CONFLICT DO NOTHING;
END $$;
*/

-- 6. Public Access for simplicity in dev (but we aim for RBAC)
CREATE POLICY "Allow public all on roles" ON roles FOR ALL USING (true);
CREATE POLICY "Allow public all on permissions" ON role_permissions FOR ALL USING (true);
CREATE POLICY "Allow public all on profiles" ON user_profiles FOR ALL USING (true);
