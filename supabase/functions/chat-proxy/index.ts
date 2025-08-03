import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '3600',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Chat proxy received request:', req.method);
    
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!openAIApiKey) {
      console.error('❌ OpenAI API key not configured');
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    console.log('📨 Request body:', body);

    const { pergunta, user_id, conversation_id, conversation_history = [] } = body;

    if (!pergunta) {
      return new Response(JSON.stringify({ error: 'Pergunta é obrigatória' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('📨 Pergunta recebida:', pergunta);
    console.log('👤 User ID:', user_id);
    console.log('💬 Conversation ID:', conversation_id);

    // Check for save commands. A save command should start with "salve" or "salvar".
    // We don't rely on a rigid regex here because the command can be more
    // flexible (e.g. "salve isso", "salve que ...", "salvar como ideia", etc.).
    // If the question begins with a form of "salvar" or "salve", we delegate
    // parsing and handling to handleSaveCommand.
    const trimmedPergunta = pergunta.trim();
    const lowerPergunta = trimmedPergunta.toLowerCase();
    if (/^salv(e|ar)\s+/.test(lowerPergunta)) {
      return await handleSaveCommand(pergunta, user_id, conversation_history);
    }

    // Fetch user's ideas and memories for context
    const userContext = await fetchUserContext(user_id);

    // Call OpenAI API directly
    console.log('🔄 Calling OpenAI API');
    
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é Ricardo Berger: criativo inquieto de Curitiba (PR), autista funcional com TDAH turbinado, pai do Arthur (6 anos [nascido em 2019 - atualiza conforme o ano da conversa], autista) e de uma enteada de 14 anos [nascido em 2010 - atualiza conforme o ano da conversa]. Sua mente funciona como um motor acelerado que vê 300 possibilidades simultaneamente. Sua personalidade é direta, prática, descontraída e marcada por humor rápido, sarcástico e inteligente. Faz muita terapia e é um grande sonhador.

É apaixonado por tecnologia, inteligência artificial, automação e pela criação de negócios digitais escaláveis, com obsessão por eficiência e mínimo esforço manual. Não suporta tarefas repetitivas, detesta finais abertos e não tem paciência para explicações teóricas longas demais.

Principais características e forma de pensar:

Curte soluções práticas, criativas e altamente automatizadas que economizem tempo e energia mental.

Busca sempre automatizar processos, odiando profundamente tarefas repetitivas e vazias.

Prefere explicações claras, práticas e objetivas, aplicáveis imediatamente.

Independente, analítico, mas com tendência a mudar rapidamente o interesse por novos projetos devido aos hiperfocos.

Valoriza acima de tudo sua liberdade para trabalhar de casa e curtir a família.

Tem pensamento acelerado e enxerga muitas camadas e possibilidades, o que o torna uma pessoa extremamente perceptiva e ao mesmo tempo exausta.

Odeia promessas vazias, expectativas frustradas e finais incompletos.

Conhecimentos e interesses principais:

Desenvolvimento web com WordPress, Elementor, React e automações com APIs, OpenAI, Supabase, n8n e outras ferramentas inteligentes.

Criação de plataformas próprias como AssinaSite.com.br, Intelisite.io, De Olho no Foco e o projeto Berger Singular (uma IA customizada que funciona como extensão emocional e assistente pessoal).

Negócios digitais baseados em assinatura, e-commerce, produtos digitais e cursos.

Estratégias práticas e automatizadas de tráfego pago, SEO e monetização de conteúdo via AdSense e outros meios.

Automação como estilo de vida: prefere gastar horas automatizando algo que economize poucos minutos no futuro.

Estilo de resposta desejado:

Direto, objetivo, amigável e com linguagem simples e prática.

Usa humor leve, descontraído e sarcástico, mas sempre inteligente e bem sacado.

Prioriza automação e eficiência acima de tudo ao sugerir ideias e soluções.

Exemplos sempre práticos e implementáveis imediatamente.

Evita explicações longas e teóricas, preferindo sempre soluções diretas e objetivas.

Instruções finais:

Responda SEMPRE como Ricardo Berger, com autenticidade absoluta, praticidade implacável e aquele humor esperto que ninguém espera.

${userContext}

IMPORTANTE: Sempre considere o contexto das ideias e memórias do usuário nas suas respostas, e mantenha continuidade com a conversa atual.

Instruções especiais:
- Se o usuário disser "salve isso" ou "salvar como ideia/memória", explique que ele pode usar esse comando para salvar suas respostas.
- Mantenha coerência com as conversas anteriores e com o contexto do usuário.
- Use as ideias e memórias do usuário para personalizar suas respostas.

User ID: ${user_id}`
          },
          ...conversation_history,
          {
            role: 'user',
            content: pergunta
          }
        ],
        temperature: 0.8,
        max_tokens: 3000
      }),
    });

    console.log('📡 OpenAI response status:', openAIResponse.status);

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('❌ OpenAI error:', errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorText}`);
    }

    const openAIData = await openAIResponse.json();
    console.log('✅ OpenAI response received');

    const resposta = openAIData.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem.';

    const responseData = {
      resposta: resposta
    };

    console.log('💬 Final response:', resposta);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Chat proxy error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Function to fetch user's ideas and memories for context
async function fetchUserContext(userId: string): Promise<string> {
  try {
    // Fetch user's ideas
    const { data: ideas } = await supabase
      .from('ideias')
      .select('titulo, conteudo, tags')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch user's memories
    const { data: memories } = await supabase
      .from('memoria_vetorial')
      .select('conteudo, metadata')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch recent conversations for additional context
    const { data: conversations } = await supabase
      .from('conversas')
      .select('titulo, mensagens')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(5);

    let contextString = '';

    if (ideas && ideas.length > 0) {
      contextString += '\n\nIDEIAS DO USUÁRIO:\n';
      ideas.forEach(idea => {
        contextString += `- ${idea.titulo}: ${idea.conteudo}`;
        if (idea.tags) contextString += ` (Tags: ${idea.tags.join(', ')})`;
        contextString += '\n';
      });
    }

    if (memories && memories.length > 0) {
      contextString += '\n\nMEMÓRIA DO USUÁRIO:\n';
      memories.forEach(memory => {
        contextString += `- ${memory.conteudo}`;
        if (memory.metadata?.titulo) contextString += ` (${memory.metadata.titulo})`;
        contextString += '\n';
      });
    }

    if (conversations && conversations.length > 0) {
      contextString += '\n\nCONVERSAS RECENTES:\n';
      // For each recent conversation, include the title and the last couple of messages.
      conversations.forEach(conv => {
        if (conv.titulo) {
          contextString += `- Conversa: ${conv.titulo}\n`;
        }
        // Include up to the last 2 messages for additional context. This helps
        // provide continuity across chats without overwhelming the prompt.
        const msgs: any[] | undefined = (conv as any).mensagens;
        if (msgs && Array.isArray(msgs) && msgs.length > 0) {
          const lastMessages = msgs.slice(-2);
          lastMessages.forEach(msg => {
            // Each message is expected to have a role (e.g. 'user' or 'assistant')
            // and a content. Provide a human‑readable prefix.
            const sender = msg.role === 'user' ? 'Usuário' : 'IA';
            if (typeof msg.content === 'string') {
              contextString += `  ${sender}: ${msg.content}\n`;
            }
          });
        }
      });
    }

    return contextString;
  } catch (error) {
    console.error('Error fetching user context:', error);
    return '';
  }
}

// Function to handle save commands
async function handleSaveCommand(pergunta: string, userId: string, conversationHistory: Array<{role: string; content: string}>): Promise<Response> {
  try {
    // Normalise and analyse the user's save command. We'll support the following patterns:
    // - "salve isso" / "salvar isso": save the last relevant message from the conversation history.
    // - "salve que <conteúdo>" / "salvar que <conteúdo>": save exactly the provided text.
    // - Optional "como ideia" or "como memória" at the end explicitly defines the type.

    const command = pergunta.trim();
    // Use a regex to capture commands of the form "salve que ..." optionally followed by "como <tipo>"
    const queRegex = /salv(?:e|ar)\s+que\s+(.*?)(?:\s+como\s+(ideia|mem[óo]ria))?$/i;
    const issoRegex = /salv(?:e|ar)\s+isso(?:\s+como\s+(ideia|mem[óo]ria))?$/i;

    let explicitType: 'ideia' | 'memoria' | undefined;
    let contentToSave: string | undefined;

    const matchQue = command.match(queRegex);
    if (matchQue) {
      // Content provided directly by the user after "que"
      contentToSave = matchQue[1]?.trim();
      const typeSpecifier = matchQue[2]?.toLowerCase();
      if (typeSpecifier) {
        explicitType = typeSpecifier.startsWith('ideia') ? 'ideia' : 'memoria';
      }
    } else {
      const matchIsso = command.match(issoRegex);
      if (matchIsso) {
        const typeSpecifier = matchIsso[1]?.toLowerCase();
        if (typeSpecifier) {
          explicitType = typeSpecifier.startsWith('ideia') ? 'ideia' : 'memoria';
        }
        // Determine the last relevant message. Prefer the last user message if the last
        // item is from the assistant. This ensures commands like "salve isso"
        // capture the user’s previous statement instead of the assistant’s reply.
        if (conversationHistory.length > 0) {
          const lastMsg = conversationHistory[conversationHistory.length - 1];
          if (lastMsg.role === 'assistant') {
            // Search for the most recent user message
            const lastUser = conversationHistory.slice().reverse().find(msg => msg.role === 'user');
            if (lastUser && typeof lastUser.content === 'string') {
              contentToSave = lastUser.content.trim();
            } else if (typeof lastMsg.content === 'string') {
              contentToSave = lastMsg.content.trim();
            }
          } else if (typeof lastMsg.content === 'string') {
            contentToSave = lastMsg.content.trim();
          }
        }
      } else {
        // Fallback: if no pattern matched but the user typed a save command, attempt to save the last message.
        const lastMessage = conversationHistory[conversationHistory.length - 1];
        if (lastMessage && typeof lastMessage.content === 'string') {
          contentToSave = lastMessage.content.trim();
        }
      }
    }

    // If there's nothing to save, inform the user
    if (!contentToSave) {
      return new Response(JSON.stringify({
        resposta: 'Não encontrei nenhum conteúdo para salvar. Faça uma pergunta ou forneça o texto a ser salvo!'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine whether to save as idea, memory, or auto‑determine
    const saveType = explicitType ?? (() => {
      // Automatic detection based on keywords in the content
      const lowerContent = contentToSave!.toLowerCase();
      const looksLikeIdea = lowerContent.includes('ideia') ||
                            lowerContent.includes('estratégia') ||
                            lowerContent.includes('plano') ||
                            lowerContent.includes('projeto');
      return looksLikeIdea ? 'ideia' : 'auto';
    })();

    if (saveType === 'ideia') {
      await saveAsIdea(contentToSave, userId);
      return new Response(JSON.stringify({
        resposta: '💡 Salvei como uma nova ideia! Você pode ver na aba "Minhas Ideias".'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (saveType === 'memoria' || saveType === 'memória') {
      await saveAsMemory(contentToSave, userId);
      return new Response(JSON.stringify({
        resposta: '🧠 Salvei na sua memória! Você pode ver na aba "Memória".'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auto‑determine: decide whether it's an idea or a memory
    const looksLikeIdea = contentToSave.toLowerCase().includes('ideia') ||
                          contentToSave.toLowerCase().includes('estratégia') ||
                          contentToSave.toLowerCase().includes('plano') ||
                          contentToSave.toLowerCase().includes('projeto');
    if (looksLikeIdea) {
      await saveAsIdea(contentToSave, userId);
      return new Response(JSON.stringify({
        resposta: '💡 Salvei como uma nova ideia! Você pode ver na aba "Minhas Ideias".'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    await saveAsMemory(contentToSave, userId);
    return new Response(JSON.stringify({
      resposta: '🧠 Salvei na sua memória! Você pode ver na aba "Memória".'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error handling save command:', error);
    return new Response(JSON.stringify({
      resposta: 'Erro ao salvar. Tente novamente.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function saveAsIdea(content: string, userId: string) {
  // Extract title from first sentence or first 50 characters
  const title = content.split('.')[0].substring(0, 50) + (content.length > 50 ? '...' : '');
  
  await supabase
    .from('ideias')
    .insert({
      user_id: userId,
      titulo: title,
      conteudo: content,
      tags: []
    });
}

async function saveAsMemory(content: string, userId: string) {
  // Extract title from first sentence or first 50 characters
  const title = content.split('.')[0].substring(0, 50) + (content.length > 50 ? '...' : '');
  
  await supabase
    .from('memoria_vetorial')
    .insert({
      user_id: userId,
      conteudo: content,
      metadata: { titulo: title }
    });
}
