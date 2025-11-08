import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const schema = `
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

      -- Update triggers for updated_at (function already exists from initial schema)
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
    `

    const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql: schema })

    if (error) {
      console.error('Error initializing database:', error)
      
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          note: 'Please run the schema SQL manually in the Supabase SQL Editor',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Database schema initialized successfully',
    })
  } catch (error: any) {
    console.error('Error in init-db:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        note: 'Please run the schema SQL manually in the Supabase SQL Editor. The SQL file is available at supabase/schema.sql',
      },
      { status: 500 }
    )
  }
}
