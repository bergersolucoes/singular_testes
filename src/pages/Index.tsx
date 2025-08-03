import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Lightbulb, Brain } from "lucide-react";
import Layout from "@/components/Layout";
import ChatInterface from "@/components/ChatInterface";
import ConversationsList from "@/components/ConversationsList";
import QuickToolsMenu from "@/components/QuickToolsMenu";
import IdeiasManager from "@/components/IdeiasManager";
import MemoriaManager from "@/components/MemoriaManager";

interface Conversation {
  id: string;
  titulo: string;
  mensagens: any[];
  created_at: string;
  updated_at: string;
}

const Index = () => {
  const [activeTab, setActiveTab] = useState("chat");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };

  const handleNewConversation = () => {
    setSelectedConversationId(null);
  };

  const handleConversationsUpdate = (updatedConversations: Conversation[]) => {
    setConversations(updatedConversations);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Bem-vindo ao Berger Singular</h1>
          <p className="text-muted-foreground">Sua IA pessoal para ideias e conversas inteligentes</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat IA
            </TabsTrigger>
            <TabsTrigger value="ideias" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Minhas Ideias
            </TabsTrigger>
            <TabsTrigger value="memoria" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Memória
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Left column with conversations list and quick tools menu */}
              <div className="lg:col-span-1 space-y-4">
                <ConversationsList
                  onSelectConversation={handleSelectConversation}
                  onNewConversation={handleNewConversation}
                  selectedConversationId={selectedConversationId}
                  conversations={conversations}
                  onConversationsUpdate={handleConversationsUpdate}
                />
                {/* Quick tools menu placed below the conversations list */}
                <QuickToolsMenu />
              </div>
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Chat com IA
                    </CardTitle>
                    <CardDescription>
                      Converse com sua assistente pessoal
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ChatInterface
                      conversationId={selectedConversationId}
                      onConversationUpdate={handleConversationsUpdate}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ideias" className="space-y-4">
            <IdeiasManager />
          </TabsContent>

          <TabsContent value="memoria" className="space-y-4">
            <MemoriaManager />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Index;
