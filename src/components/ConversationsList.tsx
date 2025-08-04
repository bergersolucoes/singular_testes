import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';

interface Conversation {
  id: string;
  titulo: string;
  mensagens: any[];
  created_at: string;
  updated_at: string;
}

interface ConversationsListProps {
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  selectedConversationId?: string | null;
  conversations: Conversation[];
  onConversationsUpdate: (conversations: Conversation[]) => void;
}

/*
 * Displays the list of conversations for the authenticated user.  When the
 * viewer is not logged in we inform them that conversations will not be
 * saved and provide a call to action to log in.  This component was
 * adapted to support a guest mode: previously it assumed a user was
 * always authenticated and would throw an error otherwise.
 */
const ConversationsList = ({
  onSelectConversation,
  onNewConversation,
  selectedConversationId,
  conversations,
  onConversationsUpdate,
}: ConversationsListProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Capture current user once on mount
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Guest users have no saved conversations
        setIsLoading(false);
        setUser(null);
        return;
      }
      const { data, error } = await supabase
        .from('conversas')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      onConversationsUpdate((data || []) as any);
      setUser(user);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      toast({
        title: 'Erro ao carregar conversas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir esta conversa?')) return;
    try {
      const { error } = await supabase
        .from('conversas')
        .delete()
        .eq('id', conversationId);
      if (error) throw error;
      toast({
        title: 'Conversa excluída',
        description: 'A conversa foi removida com sucesso.',
      });
      await loadConversations();
      if (selectedConversationId === conversationId) {
        onNewConversation();
      }
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Erro ao excluir conversa',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="h-[400px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> Conversas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Carregando conversas...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Guest view
  if (!user) {
    return (
      <Card className="h-[400px]">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> Conversas
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Você está utilizando o modo convidado. As conversas não serão salvas.
          </p>
          <Button onClick={() => navigate('/auth')}>Salvar histórico</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[400px]">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> Conversas
          </CardTitle>
          <Button size="sm" onClick={onNewConversation}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          {conversations.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">Nenhuma conversa ainda</p>
              <p className="text-xs text-muted-foreground">Clique em + para iniciar uma nova conversa</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedConversationId === conversation.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate">{conversation.titulo}</h4>
                    <p className="text-xs text-muted-foreground">
                      {conversation.mensagens?.length || 0} mensagens
                    </p>
                    <CardDescription className="text-xs">
                      {new Date(conversation.updated_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDeleteConversation(conversation.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ConversationsList;