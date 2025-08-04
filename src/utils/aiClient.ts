// Funções utilitárias para comunicação com a IA via Edge Function do Supabase.

const SUPABASE_URL: string | undefined = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'As variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidas'
  );
}

export const sendMessageToAI = async (
  pergunta: string,
  _userId?: string,
  _conversationId?: string,
  _conversationHistory?: Array<{ role: string; content: string }>
): Promise<string> => {
  return sendMessage(pergunta);
};

export async function sendMessage(pergunta: string): Promise<string> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/chat-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: pergunta }],
      }),
    });

    const data = await response.json();
    console.log("🔹 Resposta recebida da Edge Function:", data);

    if (!response.ok) {
      console.error('❌ Erro na Edge Function:', data);
      throw new Error(data.error?.message || 'Erro na Edge Function');
    }

    // ✅ Corrigido: Pega corretamente a mensagem retornada pelo modelo
    const reply =
      data.choices?.[0]?.message?.content?.trim() || 'Sem resposta.';

    return reply;
  } catch (err) {
    console.error('❌ Erro ao comunicar com a IA:', err);
    return 'Erro ao comunicar com a IA.';
  }
}
