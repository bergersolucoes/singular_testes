import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, Lightbulb, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Ideia {
  id: string;
  titulo: string;
  conteudo: string;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

/*
 * IdeiasManager gerencia o CRUD de ideias do usuário. Em modo convidado
 * (quando não há usuário autenticado via Supabase), não são carregadas
 * nem salvas ideias. Um botão permite navegar para a página de login
 * caso a pessoa queira salvar seu histórico.
 */
const IdeiasManager = () => {
  const [ideias, setIdeias] = useState<Ideia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingIdeia, setEditingIdeia] = useState<Ideia | null>(null);
  const [formData, setFormData] = useState({
    titulo: "",
    conteudo: "",
    tags: "",
  });
  const [isGuest, setIsGuest] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Ao montar, verifica se existe usuário autenticado. Caso exista,
    // carrega as ideias. Caso contrário, ativa o modo convidado.
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsGuest(true);
        setIsLoading(false);
        return;
      }
      setIsGuest(false);
      await loadIdeias();
    };
    init();
    // Dependência vazia para executar apenas na montagem
  }, []);

  const loadIdeias = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        // Em modo convidado não há ideias a carregar
        setIdeias([]);
        return;
      }
      const { data, error } = await supabase
        .from("ideias")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setIdeias(data || []);
    } catch (error: any) {
      console.error("Error loading ideias:", error);
      toast({
        title: "Erro ao carregar ideias",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // Antes de salvar, verifica se o usuário está autenticado
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Necessário login",
        description: "Faça login ou crie uma conta para salvar suas ideias.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    if (!formData.titulo.trim() || !formData.conteudo.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Título e conteúdo são obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    try {
      const tags = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
      if (editingIdeia) {
        // Atualiza ideia existente
        const { error } = await supabase
          .from("ideias")
          .update({
            titulo: formData.titulo,
            conteudo: formData.conteudo,
            tags: tags.length > 0 ? tags : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingIdeia.id);
        if (error) throw error;
        toast({
          title: "Ideia atualizada",
          description: "Sua ideia foi atualizada com sucesso.",
        });
      } else {
        // Cria nova ideia
        const { error } = await supabase
          .from("ideias")
          .insert({
            titulo: formData.titulo,
            conteudo: formData.conteudo,
            tags: tags.length > 0 ? tags : null,
            user_id: user.id,
          });
        if (error) throw error;
        toast({
          title: "Ideia criada",
          description: "Sua nova ideia foi salva com sucesso.",
        });
      }
      await loadIdeias();
      handleCloseDialog();
    } catch (error: any) {
      console.error("Error saving ideia:", error);
      toast({
        title: "Erro ao salvar ideia",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta ideia?")) return;
    try {
      const { error } = await supabase.from("ideias").delete().eq("id", id);
      if (error) throw error;
      toast({
        title: "Ideia excluída",
        description: "A ideia foi removida com sucesso.",
      });
      await loadIdeias();
    } catch (error: any) {
      console.error("Error deleting ideia:", error);
      toast({
        title: "Erro ao excluir ideia",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (ideia: Ideia) => {
    setEditingIdeia(ideia);
    setFormData({
      titulo: ideia.titulo,
      conteudo: ideia.conteudo,
      tags: ideia.tags?.join(", ") || "",
    });
    setIsOpen(true);
  };

  const handleCloseDialog = () => {
    setIsOpen(false);
    setEditingIdeia(null);
    setFormData({
      titulo: "",
      conteudo: "",
      tags: "",
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Lightbulb className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Carregando suas ideias...</p>
      </div>
    );
  }

  // Caso esteja no modo convidado, exibe mensagem e opção de login
  if (isGuest) {
    return (
      <div className="text-center py-8 space-y-4">
        <Lightbulb className="h-16 w-16 text-muted-foreground mx-auto" />
        <p className="text-muted-foreground mb-4">
          Você está usando o modo convidado. Suas ideias não serão salvas.
        </p>
        <Button onClick={() => navigate("/auth")}>Salvar histórico</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Suas Ideias</h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Ideia
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingIdeia ? "Editar Ideia" : "Nova Ideia"}
              </DialogTitle>
              <DialogDescription>
                {editingIdeia
                  ? "Atualize sua ideia abaixo."
                  : "Adicione uma nova ideia ao seu repositório."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Título da sua ideia"
                />
              </div>
              <div>
                <Label htmlFor="conteudo">Conteúdo</Label>
                <Textarea
                  id="conteudo"
                  value={formData.conteudo}
                  onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                  placeholder="Descreva sua ideia..."
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="javascript, projeto, inovação"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1">
                  <Save className="mr-2 h-4 w-4" />
                  {editingIdeia ? "Atualizar" : "Salvar"}
                </Button>
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {ideias.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Lightbulb className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Nenhuma ideia cadastrada ainda</p>
            <p className="text-sm text-muted-foreground">
              Clique em "Nova Ideia" para começar a organizar seus pensamentos
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ideias.map((ideia) => (
            <Card key={ideia.id} className="h-fit">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg line-clamp-2">{ideia.titulo}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(ideia)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(ideia.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {ideia.tags && ideia.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {ideia.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">{ideia.conteudo}</p>
                <CardDescription className="mt-2">
                  Criada em {new Date(ideia.created_at).toLocaleDateString()}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default IdeiasManager;