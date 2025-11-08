-- Extended schema for NutriPlan
-- This extends the existing patients and payments tables

-- Add password field to existing patients table
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT '';

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  cpf TEXT NOT NULL,
  phone TEXT NOT NULL,
  crn TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create meal_plans table
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  plan_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  ingredients TEXT[] NOT NULL DEFAULT '{}',
  preparation TEXT NOT NULL,
  prep_time INTEGER,
  servings INTEGER,
  calories INTEGER,
  category TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_meal_plans_patient_id ON meal_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_status ON meal_plans(status);
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);

-- Update triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_meal_plans_updated_at
  BEFORE UPDATE ON meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments on new tables
COMMENT ON TABLE admins IS 'Tabela de administradores (nutricionistas)';
COMMENT ON TABLE meal_plans IS 'Tabela de planos alimentares dos pacientes';
COMMENT ON TABLE recipes IS 'Tabela de receitas disponibilizadas pela nutricionista';

COMMENT ON COLUMN meal_plans.plan_data IS 'Dados completos do plano alimentar em formato JSON';
COMMENT ON COLUMN meal_plans.status IS 'Status do plano (active, completed, cancelled)';
COMMENT ON COLUMN recipes.ingredients IS 'Lista de ingredientes da receita';
