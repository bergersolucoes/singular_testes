import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sendMessageToAI } from '@/utils/aiClient';
import { useNavigate } from 'react-router-dom';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface Conversation {
  id: string;
  titulo: string;
  mensagens: any;
  created_at: string;
}

interface ChatInterfaceProps {
  conversationId?: string;
  onConversationUpdate?: (conversations: Conversation[]) => void;
}

/*
 * The chat interface allows both authenticated and guest users to talk with
 * the AI.  Guest users can chat freely but their messages are not saved
 * and they cannot load previous conversations.  When a guest wishes
 * to persist a chat, a button is provided to navigate to the login
 * screen.
 */
const ChatInterface = ({ conversationId, onConversationUpdate }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Determine whether there is a logged in user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  useEffect(() => {
    if (conversationId && user) {
      loadConversation(conversationId);
    } else {
      // Clear messages when starting a new conversation or when not authenticated
      setMessages([]);
      setCurrentConversationId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, user]);

  const loadConversation = async (id: string) => {
    try {
      // Only load conversations for authenticated users
      if (!user) return;
      const { data, error } = await supabase
        .from('conversas')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      if (data) {
        const msgs = Array.isArray(data.mensagens) ? (data.mensagens as unknown as Message[]) : [];
        setMessages(msgs);
        setCurrentConversationId(id);
      }
    } catch (error: any) {
      console.error('Error loading conversation:', error);
      toast({
        title: 'Erro ao carregar conversa',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const saveConversation = async (newMessages: Message[], title?: string) => {
    try {
      // Persist only for authenticated users
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (currentConversationId) {
        const { error } = await supabase
          .from('conversas')
          .update({
            mensagens: newMessages as any,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentConversationId);
        if (error) throw error;
      } else {
        const conversationTitle = title || `Conversa ${new Date().toLocaleDateString()}`;
        const { data, error } = await supabase
          .from('conversas')
          .insert({
            titulo: conversationTitle,
            mensagens: newMessages as any,
            user_id: user.id,
          })
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setCurrentConversationId(data.id);
        }
      }
      if (onConversationUpdate) {
        const { data: conversations, error } = await supabase
          .from('conversas')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });
        if (!error && conversations) {
          onConversationUpdate(conversations as any);
        }
      }
    } catch (error: any) {
      console.error('Error saving conversation:', error);
      toast({
        title: 'Erro ao salvar conversa',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      role: 'user',
      timestamp: new Date(),
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Use a stable identifier for guests so that the backend can handle it
      const userId = user?.id || 'guest';
      const conversationHistory = messages.map((msg) => ({ role: msg.role, content: msg.content }));
      const aiResponse = await sendMessageToAI(
        userMessage.content,
        userId,
        user ? currentConversationId || undefined : undefined,
        conversationHistory
      );
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        role: 'assistant',
        timestamp: new Date(),
      };
      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);
      // Save conversation only when authenticated
      if (user) {
        await saveConversation(finalMessages, userMessage.content.slice(0, 50));
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro ao enviar mensagem',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[600px]">
      {/* Prompt guest users to sign in if they wish to persist the conversation */}
      {!user && (
        <div className="mb-4">
          <Button onClick={() => navigate('/auth')}>Salvar histórico</Button>
        </div>
      )}
      <ScrollArea className="flex-1 p-4">
        {messages.map((message) => (
          <div key={message.id} className="mb-4 flex items-start gap-2">
            {message.role === 'assistant' ? (
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            )}
            <div className="max-w-full">
              <div
                className={`rounded-lg px-4 py-2 ${
                  message.role === 'assistant' ? 'bg-muted' : 'bg-primary text-primary-foreground'
                }`}
              >
                {message.content}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </ScrollArea>
      <Card>
        <CardContent className="p-4 flex items-center gap-2">
          <Input
            placeholder="Digite uma mensagem..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isLoading}
          />
          <Button onClick={sendMessage} disabled={isLoading || !inputMessage.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatInterface;