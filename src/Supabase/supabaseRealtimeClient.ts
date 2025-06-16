// Supabase Realtime Client
// Importe este client para usar recursos de realtime e queries JS:
// import { supabase } from './supabaseRealtimeClient';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY!; // ou ANON_KEY se disponível

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 
