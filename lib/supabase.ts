import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  patients: {
    id: string
    name: string
    cpf: string | null
    email: string
    phone: string
    password: string
    asaas_customer_id: string | null
    quiz_responses: any
    created_at: string
    updated_at: string
  }
  admins: {
    id: string
    name: string
    email: string
    password: string
    cpf: string
    phone: string
    crn: string
    created_at: string
    updated_at: string
  }
  meal_plans: {
    id: string
    patient_id: string
    title: string
    description: string | null
    start_date: string
    end_date: string | null
    status: 'active' | 'completed' | 'cancelled'
    plan_data: any
    created_at: string
    updated_at: string
  }
  recipes: {
    id: string
    title: string
    description: string | null
    ingredients: string[]
    preparation: string
    prep_time: number | null
    servings: number | null
    calories: number | null
    category: string | null
    image_url: string | null
    created_at: string
    updated_at: string
  }
  payments: {
    id: string
    patient_id: string
    asaas_id: string
    asaas_customer_id: string | null
    amount: number
    status: string
    payment_url: string | null
    created_at: string
    updated_at: string
  }
}
