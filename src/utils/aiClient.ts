// Funções utilitárias para comunicação com a IA via Edge Function do Supabase.
// Esta implementação substitui a função de envio de mensagem original, usando
// a nova interface exigida pelo usuário. A função envia apenas a pergunta do
// usuário como um objeto dentro do array `messages` com as chaves `role` e
// `content`. Parâmetros adicionais (userId, conversationId, conversationHistory)
// são aceitos para compatibilidade com chamadas existentes, mas são ignorados.

const SUPABASE_URL: string | undefined = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('As variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidas');
}

export const sendMessageToAI = async (
  pergunta: string,
  _userId?: string,
  _conversationId?: string,
  _conversationHistory?: Array<{ role: string; content: string }>
): Promise<string> => {
  return sendMessage(pergunta);
};

// Implementação principal de envio de mensagem conforme requisitado.
export async function sendMessage(pergunta: string): Promise<string> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/chat-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: pergunta },
        ],
      }),
    });

    const data = await response.json();

    // Trata a resposta mesmo em caso de erro
    if (!response.ok) {
      console.error('Erro na Edge Function:', data.error || data);
    }

    // Se veio erro, tenta usar a mensagem do erro; senão, pega a resposta da IA
    const reply =
      data?.choices?.[0]?.message?.content ||
      data?.error?.message ||
      'Sem resposta.';

    return reply;
  } catch (err) {
    console.error('Erro ao comunicar com a IA:', err);
    return 'Erro ao comunicar com a IA.';
  }
}
