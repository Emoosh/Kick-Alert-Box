import { createClient } from "@supabase/supabase-js";

// Environment değişkenlerini al
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Supabase client oluştur
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
