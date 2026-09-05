import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vupdeaqxftanhturjrrq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_njLbD655lyCGqQ_JdncluA_gXMCRWBA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
