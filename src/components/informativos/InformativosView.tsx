import React, { useMemo, useState } from "react";
import { Session } from "@/hooks/useAuth";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useInformativos, InformativoType } from "@/hooks/useInformativos";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Info, Wrench } from "lucide-react";

export function InformativosView({ session }: { session: Session }) {
  const access = useAccessControl(session);
  const isAdmin = !!access?.perms && access.perms.role === "master";
  const { items, createInformativo } = useInformativos();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<InformativoType>("Informativo");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => (i.title + " " + i.content).toLowerCase().includes(q));
  }, [items, search]);

  const iconFor = (t: InformativoType) =>
    t === "Alerta" ? <AlertCircle className="w-5 h-5 text-destructive" /> : t === "Manutenção" ? <Wrench className="w-5 h-5 text-warning" /> : <Info className="w-5 h-5 text-primary" />;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    await createInformativo(title.trim(), content.trim(), type, session.id, session.name);
    setTitle("");
    setContent("");
    setType("Informativo");
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Informativos</h1>
        <p className="text-muted-foreground mt-1">Avisos gerais, alertas e manutenção do sistema</p>
      </div>

      <div className="flex items-center gap-3">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar informativos..." />
      </div>

      {isAdmin && (
        <Card className="border border-border bg-card">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Criar informativo</h3>
          </div>
          <form onSubmit={handleCreate} className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as InformativoType)}
                className="border border-border rounded-md px-2 py-1 bg-background"
              >
                <option value="Informativo">Informativo</option>
                <option value="Alerta">Alerta</option>
                <option value="Manutenção">Manutenção</option>
              </select>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" />
            </div>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Conteúdo do informativo..." rows={4} />
            <div className="flex items-center justify-end gap-2">
              <Button type="submit" disabled={!title.trim() || !content.trim()}>Publicar</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="border border-border bg-card">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Publicações</h3>
        </div>
        <div className="p-2 sm:p-4 space-y-3">
          {filtered.length === 0 && <div className="text-sm text-muted-foreground">Nenhum informativo encontrado</div>}
          {filtered.map((i) => (
            <div key={i.id} className="p-3 rounded-md border border-border bg-background">
              <div className="flex items-center gap-2">
                {iconFor(i.type)}
                <div className="font-medium">{i.title}</div>
                <div className="text-xs text-muted-foreground ml-auto">{new Date(i.createdAt).toLocaleString("pt-BR")}</div>
              </div>
              <div className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{i.content}</div>
              <div className="text-xs mt-1 text-muted-foreground">Por {i.createdByName}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
