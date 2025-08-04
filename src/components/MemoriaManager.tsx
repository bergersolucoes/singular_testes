import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Brain, Trash2, Save, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MemoriaItem {
  id: string;
  conteudo: string;
  metadata: any;
  created_at: string;
}

const MemoriaManager = () => {
  const [memorias, setMemorias] = useState<MemoriaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    conteudo: "",
    titulo: "",
    categoria: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadMemorias();
  }, []);

  const loadMemorias = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('memoria_vetorial')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMemorias(data || []);
    } catch (error: any) {
      console.error('Error loading memorias:', error);
      toast({
        title: "Erro ao carregar memórias",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.conteudo.trim()) {
      toast({
        title: "Conteúdo obrigatório",
        description: "O conteúdo da memória é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const metadata = {
        titulo: formData.titulo || 'Sem título',
        categoria: formData.categoria || 'Geral',
        created_date: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('memoria_vetorial')
        .insert({
          conteudo: formData.conteudo,
          metadata,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "Memória salva",
        description: "Conhecimento adicionado à sua memória vetorial.",
      });

      await loadMemorias();
      handleCloseDialog();
    } catch (error: any) {
      console.error('Error saving memoria:', error);
      toast({
        title: "Erro ao salvar memória",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta memória?')) return;

    try {
      const { error } = await supabase
        .from('memoria_vetorial')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Memória excluída",
        description: "A memória foi removida com sucesso.",
      });

      await loadMemorias();
    } catch (error: any) {
      console.error('Error deleting memoria:', error);
      toast({
        title: "Erro ao excluir memória",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCloseDialog = () => {
    setIsOpen(false);
    setFormData({
      conteudo: "",
      titulo: "",
      categoria: "",
    });
  };

  const filteredMemorias = memorias.filter(memoria =>
    memoria.conteudo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    memoria.metadata?.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    memoria.metadata?.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Carregando memória vetorial...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h3 className="text-lg font-semibold">Memória Vetorial</h3>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conhecimento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Conhecimento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Adicionar Conhecimento</DialogTitle>
                <DialogDescription>
                  Adicione um novo conhecimento à sua memória vetorial.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="titulo">Título (opcional)</Label>
                  <Input
                    id="titulo"
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder="Título do conhecimento"
                  />
                </div>
                <div>
                  <Label htmlFor="categoria">Categoria (opcional)</Label>
                  <Input
                    id="categoria"
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    placeholder="Ex: Técnico, Pessoal, Projeto"
                  />
                </div>
                <div>
                  <Label htmlFor="conteudo">Conteúdo</Label>
                  <Textarea
                    id="conteudo"
                    value={formData.conteudo}
                    onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                    placeholder="Descreva o conhecimento que deseja armazenar..."
                    rows={6}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} className="flex-1">
                    <Save className="mr-2 h-4 w-4" />
                    Salvar
                  </Button>
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filteredMemorias.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            {memorias.length === 0 ? (
              <>
                <p className="text-muted-foreground mb-4">
                  Nenhum conhecimento armazenado ainda
                </p>
                <p className="text-sm text-muted-foreground">
                  Adicione conhecimentos importantes para que a IA possa usar como contexto
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                Nenhum resultado encontrado para "{searchTerm}"
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMemorias.map((memoria) => (
            <Card key={memoria.id} className="h-fit">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-base line-clamp-2">
                      {memoria.metadata?.titulo || 'Sem título'}
                    </CardTitle>
                    {memoria.metadata?.categoria && (
                      <CardDescription className="text-xs">
                        {memoria.metadata.categoria}
                      </CardDescription>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(memoria.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-4">
                  {memoria.conteudo}
                </p>
                <CardDescription className="mt-2">
                  Adicionado em {new Date(memoria.created_at).toLocaleDateString()}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MemoriaManager;