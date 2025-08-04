// Centraliza a criação do cliente Supabase utilizando variáveis de ambiente do Vite.
// Em projetos Vite, variáveis de ambiente voltadas para o client‑side devem ter o prefixo VITE_.
// Caso as variáveis não estejam definidas, uma exceção é lançada para alertar a falta de configuração.
import { createClient } from '@supabase/supabase-js';

// Substitui o uso de variáveis de ambiente do Node por import.meta.env, conforme recomendado pelo Vite.
const supabaseUrl: string | undefined = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be provided');
}

// Cria o cliente Supabase utilizando apenas a URL e a chave anônima.
export const supabase = createClient(supabaseUrl, supabaseKey);