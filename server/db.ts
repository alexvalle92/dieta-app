import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";

const { Pool } = pg;

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Supabase requer conexão SSL
const isSupabase = connectionString.includes('supabase.co');

export const pool = new Pool({ 
  connectionString,
  ssl: isSupabase ? { rejectUnauthorized: false } : false
});

export const db = drizzle(pool, { schema });
