-- Extended schema for NutriPlan
-- This extends the existing patients and payments tables

-- Create or replace update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE public.admins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  cpf text NOT NULL,
  phone text NOT NULL,
  crn text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admins_pkey PRIMARY KEY (id)
);
CREATE TABLE public.chat_messages (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id text,
  bot_message text,
  phone text,
  user_name text,
  user_message text,
  conversation_id text,
  message_type text,
  active boolean DEFAULT true,
  app text DEFAULT 'delivery'::text,
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.chats (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  phone text,
  updated_at timestamp with time zone DEFAULT now(),
  conversation_id text,
  app text DEFAULT 'delivery'::text,
  CONSTRAINT chats_pkey PRIMARY KEY (id)
);
CREATE TABLE public.daily_messages (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  mensagem text NOT NULL,
  dia_semana integer,
  acesso_app boolean NOT NULL DEFAULT false,
  CONSTRAINT daily_messages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.leads (
  telefone bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  nome character varying,
  CONSTRAINT leads_pkey PRIMARY KEY (telefone)
);
CREATE TABLE public.meal_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text])),
  plan_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT meal_plans_pkey PRIMARY KEY (id),
  CONSTRAINT meal_plans_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);
CREATE TABLE public.password_reset_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  token character varying NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT password_reset_tokens_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);
CREATE TABLE public.patients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cpf text,
  email text NOT NULL UNIQUE,
  phone text NOT NULL,
  asaas_customer_id text,
  quiz_responses jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  password text NOT NULL DEFAULT ''::text,
  CONSTRAINT patients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  asaas_id text,
  asaas_customer_id text,
  amount numeric NOT NULL,
  status text,
  payment_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  invoice_number bigint,
  billing_type text,
  payment_date date,
  due_date date,
  event_webhook text,
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);
CREATE TABLE public.plano_alimentar (
  id bigint NOT NULL DEFAULT nextval('plano_alimentar_id_seq'::regclass),
  content text,
  metadata jsonb,
  embedding USER-DEFINED,
  CONSTRAINT plano_alimentar_pkey PRIMARY KEY (id)
);
CREATE TABLE public.recipes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  ingredients ARRAY NOT NULL DEFAULT '{}'::text[],
  preparation text NOT NULL,
  prep_time integer,
  servings integer,
  calories integer,
  category text,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT recipes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tabela_alimentos_ibge (
  id bigint NOT NULL DEFAULT nextval('tabela_alimentos_ibge_id_seq'::regclass),
  content text,
  metadata jsonb,
  embedding USER-DEFINED,
  CONSTRAINT tabela_alimentos_ibge_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tabela_alimentos_taco (
  id bigint NOT NULL DEFAULT nextval('tabela_alimentos_taco_id_seq'::regclass),
  content text,
  metadata jsonb,
  embedding USER-DEFINED,
  CONSTRAINT tabela_alimentos_taco_pkey PRIMARY KEY (id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_meal_plans_patient_id ON meal_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_status ON meal_plans(status);
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_patient_id ON password_reset_tokens(patient_id);

-- Update triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_admins_updated_at') THEN
    CREATE TRIGGER update_admins_updated_at
      BEFORE UPDATE ON admins
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_meal_plans_updated_at') THEN
    CREATE TRIGGER update_meal_plans_updated_at
      BEFORE UPDATE ON meal_plans
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_recipes_updated_at') THEN
    CREATE TRIGGER update_recipes_updated_at
      BEFORE UPDATE ON recipes
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Comments on new tables
COMMENT ON TABLE admins IS 'Tabela de administradores (nutricionistas)';
COMMENT ON TABLE meal_plans IS 'Tabela de planos alimentares dos pacientes';
COMMENT ON TABLE recipes IS 'Tabela de receitas disponibilizadas pela nutricionista';

COMMENT ON COLUMN meal_plans.plan_data IS 'Dados completos do plano alimentar em formato JSON';
COMMENT ON COLUMN meal_plans.status IS 'Status do plano (active, completed, cancelled)';
COMMENT ON COLUMN recipes.ingredients IS 'Lista de ingredientes da receita';

-- Create app_settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  diet_technical_definition TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update trigger for app_settings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_app_settings_updated_at') THEN
    CREATE TRIGGER update_app_settings_updated_at
      BEFORE UPDATE ON app_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE app_settings IS 'Tabela de configurações gerais da aplicação';
COMMENT ON COLUMN app_settings.diet_technical_definition IS 'Definição técnica para criação de dietas';

-- Create meal_categories table
CREATE TABLE IF NOT EXISTS meal_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE meal_categories IS 'Tabela de tipos de refeições (ex: café da manhã, almoço, jantar)';

-- Create allowed_meal_items table
CREATE TABLE IF NOT EXISTS allowed_meal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_category_id UUID NOT NULL REFERENCES meal_categories(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('food', 'recipe')),
  food_name TEXT,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT item_content_check CHECK (
    (item_type = 'food' AND food_name IS NOT NULL AND recipe_id IS NULL) OR
    (item_type = 'recipe' AND recipe_id IS NOT NULL AND food_name IS NULL)
  )
);

COMMENT ON TABLE allowed_meal_items IS 'Tabela de alimentos ou receitas permitidos por tipo de refeição';

