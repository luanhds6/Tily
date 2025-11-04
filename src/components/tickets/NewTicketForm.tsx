import React, { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Paperclip, X, Upload, Clipboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NewTicketFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    category: string;
    priority: string;
    attachments: any[];
  }) => void;
  onCancel: () => void;
}

export function NewTicketForm({ onSubmit, onCancel }: NewTicketFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Geral");
  const [priority, setPriority] = useState("Média");
  const [attachments, setAttachments] = useState<any[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageItems = Array.from(items).filter((item) => item.type.startsWith("image/"));
      if (imageItems.length === 0) return;

      e.preventDefault();

      const filePromises = imageItems.map((item) => {
        return new Promise((resolve) => {
          const file = item.getAsFile();
          if (!file) return resolve(null);

          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              name: `clipboard-image-${Date.now()}.png`,
              type: file.type,
              dataUrl: reader.result,
            });
          };
          reader.readAsDataURL(file);
        });
      });

      const newAttachments = (await Promise.all(filePromises)).filter(Boolean);
      setAttachments([...attachments, ...newAttachments]);

      toast({
        title: "Imagem colada",
        description: `${newAttachments.length} imagem(ns) adicionada(s) aos anexos`,
      });
    };

    textarea.addEventListener("paste", handlePaste);
    return () => textarea.removeEventListener("paste", handlePaste);
  }, [attachments, toast]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const filePromises = files.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            name: file.name,
            type: file.type,
            dataUrl: reader.result,
          });
        };
        reader.readAsDataURL(file);
      });
    });

    const newAttachments = await Promise.all(filePromises);
    setAttachments([...attachments, ...newAttachments]);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const filePromises = files.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            name: file.name,
            type: file.type,
            dataUrl: reader.result,
          });
        };
        reader.readAsDataURL(file);
      });
    });

    const newAttachments = await Promise.all(filePromises);
    setAttachments([...attachments, ...newAttachments]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha título e descrição",
        variant: "destructive",
      });
      return;
    }

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      attachments,
    });

    toast({
      title: "Chamado criado!",
      description: "Seu chamado foi registrado com sucesso",
    });
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Novo Chamado</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Preencha os dados abaixo para abrir um novo chamado
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Descreva brevemente o problema"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Geral">Geral</SelectItem>
                  <SelectItem value="Hardware">Hardware</SelectItem>
                  <SelectItem value="Software">Software</SelectItem>
                  <SelectItem value="Rede">Rede</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Acesso">Acesso</SelectItem>
                  <SelectItem value="Impressora">Impressora</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baixa">Baixa</SelectItem>
                  <SelectItem value="Média">Média</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição do problema *</Label>
            <Textarea
              id="description"
              ref={textareaRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o problema em detalhes. Você pode colar imagens diretamente aqui (Ctrl+V ou Cmd+V)"
              className="min-h-[200px]"
              required
            />
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Clipboard className="h-3 w-3" />
              Dica: Cole prints diretamente na caixa de texto ou arraste arquivos para anexar
            </p>
          </div>

          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              Arraste arquivos aqui ou clique para selecionar
            </p>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <Button type="button" variant="outline" size="sm" asChild>
              <label htmlFor="file-upload" className="cursor-pointer">
                <Paperclip className="h-4 w-4 mr-2" />
                Selecionar arquivos
              </label>
            </Button>
          </div>

          {attachments.length > 0 && (
            <div className="space-y-2">
              <Label>Anexos ({attachments.length})</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {attachments.map((att, index) => (
                  <div key={index} className="relative group">
                    <div className="border border-border rounded-lg p-2 hover:border-primary/50 transition-colors">
                      {att.type?.startsWith("image/") ? (
                        <img
                          src={att.dataUrl}
                          alt={att.name}
                          className="w-full h-24 object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-24 flex items-center justify-center bg-muted rounded">
                          <Paperclip className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground truncate mt-1">{att.name}</p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeAttachment(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit">Abrir Chamado</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
