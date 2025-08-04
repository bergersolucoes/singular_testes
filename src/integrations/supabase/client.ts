import { createClient } from '@supabase/supabase-js';

// Leitura das variáveis de ambiente via Vite
const supabaseUrl: string | undefined = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('As variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidas');
}

// Cliente com redirecionamento configurado
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    redirectTo: `${import.meta.env.VITE_SITE_URL}/auth/v1/callback`,
  },
});
