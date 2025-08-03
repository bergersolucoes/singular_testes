
// Cliente para integração com OpenAI via Supabase Edge Function
import { supabase } from '@/integrations/supabase/client';

const CHAT_PROXY_FUNCTION = 'chat-proxy';

interface ChatRequest {
  pergunta: string;
  user_id: string;
  conversation_id?: string;
  conversation_history?: Array<{role: string; content: string}>;
}

interface ChatResponse {
  resposta: string;
  error?: string;
}

export const sendMessageToAI = async (
  pergunta: string, 
  userId: string, 
  conversationId?: string,
  conversationHistory?: Array<{role: string; content: string}>
): Promise<string> => {
  try {
    console.log('🚀 Enviando mensagem via Edge Function:', { pergunta, userId, function: CHAT_PROXY_FUNCTION });
    
    const payload: ChatRequest = {
      pergunta,
      user_id: userId,
      conversation_id: conversationId,
      conversation_history: conversationHistory || []
    };

    const { data, error } = await supabase.functions.invoke(CHAT_PROXY_FUNCTION, {
      body: payload
    });

    console.log('📡 Resposta da Edge Function:', { data, error });

    if (error) {
      console.error('❌ Erro da Edge Function:', error);
      throw new Error(`Edge Function error: ${error.message}`);
    }

    console.log('✅ Dados recebidos:', data);

    if (data.error) {
      console.error('❌ Erro retornado pela API:', data.error);
      throw new Error(data.error);
    }

    const resposta = data.resposta || 'Desculpe, não consegui processar sua mensagem.';
    console.log('💬 Resposta final:', resposta);
    
    return resposta;
  } catch (error) {
    console.error('💥 Erro ao comunicar com a IA:', error);
    
    // Fallback para resposta de erro mais amigável
    return `Erro ao conectar com a IA: ${error instanceof Error ? error.message : 'Erro desconhecido'}. Por favor, tente novamente.`;
  }
};
