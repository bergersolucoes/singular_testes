import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sendMessageToAI } from "@/utils/aiClient";

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

const ChatInterface = ({ conversationId, onConversationUpdate }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Generate a pseudo user ID for guest users. This ID is stable for the component lifecycle.
  const [guestId] = useState(() => `guest-${Math.random().toString(36).slice(2)}`);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      // Clear messages when starting a new conversation
      setMessages([]);
      setCurrentConversationId(null);
    }
  }, [conversationId]);

  const loadConversation = async (id: string) => {
    try {
      // Only attempt to load a conversation from Supabase when authenticated.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return;
      }
      const { data, error } = await supabase
        .from('conversas')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        const messages = Array.isArray(data.mensagens) ? (data.mensagens as unknown as Message[]) : [];
        setMessages(messages);
        setCurrentConversationId(id);
      }
    } catch (error: any) {
      console.error('Error loading conversation:', error);
      toast({
        title: "Erro ao carregar conversa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const saveConversation = async (newMessages: Message[], title?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (currentConversationId) {
        // Update existing conversation
        const { error } = await supabase
          .from('conversas')
          .update({
            mensagens: newMessages as any,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentConversationId);

        if (error) throw error;
      } else {
        // Create new conversation
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

      // Refresh conversations list if callback provided
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
        title: "Erro ao salvar conversa",
        description: error.message,
        variant: "destructive",
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
    setInputMessage("");
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Determine which user ID to use for the AI call.
      const userIdForAi = user ? user.id : guestId;

      // Prepare conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Enviar mensagem para a IA com contexto
      const aiResponse = await sendMessageToAI(
        userMessage.content, 
        userIdForAi, 
        currentConversationId || undefined,
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

      // Save conversation only when the user is authenticated
      if (user) {
        await saveConversation(finalMessages, userMessage.content.slice(0, 50));
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
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
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Olá! Sou sua assistente IA. Como posso ajudá-lo hoje?
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <Card className={`max-w-[80%] ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  <CardContent className="p-3">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </CardContent>
                </Card>

                {message.role === 'user' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <Card className="bg-muted">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Pensando...</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={sendMessage} 
            disabled={!inputMessage.trim() || isLoading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;