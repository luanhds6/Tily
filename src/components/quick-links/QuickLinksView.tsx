import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@/hooks/useAuth";
import {
  Link as LinkIcon,
  Globe,
  FileText,
  User,
  Settings,
  Mail,
  Bookmark,
  ChevronDown,
  Trash2,
} from "lucide-react";

type QuickLink = {
  id: string;
  title: string;
  url: string;
  icon: string; // key from ICONS_MAP
};

const LS_QUICK_LINKS = "sc_quick_links_v1";

const ICONS_MAP = {
  link: LinkIcon,
  globe: Globe,
  file: FileText,
  user: User,
  settings: Settings,
  mail: Mail,
  bookmark: Bookmark,
} as const;

const ICON_OPTIONS: { key: keyof typeof ICONS_MAP; label: string }[] = [
  { key: "link", label: "Link" },
  { key: "globe", label: "Globo" },
  { key: "file", label: "Arquivo" },
  { key: "user", label: "Usuário" },
  { key: "settings", label: "Configurações" },
  { key: "mail", label: "Email" },
  { key: "bookmark", label: "Favorito" },
];

function loadLinks(): QuickLink[] {
  try {
    const raw = localStorage.getItem(LS_QUICK_LINKS);
    return raw ? (JSON.parse(raw) as QuickLink[]) : [];
  } catch {
    return [];
  }
}

function saveLinks(links: QuickLink[]) {
  localStorage.setItem(LS_QUICK_LINKS, JSON.stringify(links));
}

export function QuickLinksView({ session }: { session: Session | null }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(true);
  const [links, setLinks] = useState<QuickLink[]>([]);

  const isAdmin = !!session && (session.role === "admin" || session.role === "master");

  // Form state
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [iconKey, setIconKey] = useState<keyof typeof ICONS_MAP>("link");

  useEffect(() => {
    setLinks(loadLinks());
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) {
      toast({ title: "Preencha nome e URL", description: "Campos obrigatórios", variant: "default" });
      return;
    }
    const newLink: QuickLink = {
      id: Math.random().toString(36).slice(2),
      title: title.trim(),
      url: url.trim(),
      icon: iconKey,
    };
    const next = [newLink, ...links];
    setLinks(next);
    saveLinks(next);
    setTitle("");
    setUrl("");
    toast({ title: "Link adicionado", description: newLink.title });
  };

  const handleRemove = (id: string) => {
    const next = links.filter((l) => l.id !== id);
    setLinks(next);
    saveLinks(next);
    toast({ title: "Link removido" });
  };

  const IconComponent = useMemo(() => ICONS_MAP[iconKey], [iconKey]);

  if (!isAdmin) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold">Links Úteis</h2>
        <p className="text-sm text-muted-foreground mt-2">Esta página é restrita a administradores.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Links Úteis</h2>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Cadastrar link de uso cotidiano</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 md:grid-cols-6 gap-3" onSubmit={handleAdd}>
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-1 block">Nome do site</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Portal RH" />
              </div>
              <div className="md:col-span-3">
                <label className="text-sm font-medium mb-1 block">URL</label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://exemplo.com" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Ícone</label>
                <Select value={iconKey} onValueChange={(v) => setIconKey(v as keyof typeof ICONS_MAP)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um ícone" />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.key} value={opt.key}>
                        <div className="flex items-center gap-2">
                          {React.createElement(ICONS_MAP[opt.key], { className: "w-4 h-4" })}
                          <span>{opt.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-6">
                <Button type="submit" className="w-full md:w-auto">Adicionar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="p-0">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              <span className="font-medium">Acesso rápido</span>
            </div>
            <Collapsible open={open} onOpenChange={setOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  {open ? "Ocultar" : "Mostrar"}
                  <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : "rotate-0"}`} />
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </CardHeader>
        <CardContent>
          <Collapsible open={open}>
            <CollapsibleContent>
              {links.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum link cadastrado ainda.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {links.map((l) => {
                    const Ic = ICONS_MAP[(l.icon as keyof typeof ICONS_MAP) || "link"];
                    return (
                      <div key={l.id} className="group relative">
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-accent hover:text-accent-foreground transition-colors"
                          title={l.title}
                        >
                          <Ic className="w-4 h-4" />
                          <span className="truncate">{l.title}</span>
                        </a>
                        {isAdmin && (
                          <button
                            onClick={() => handleRemove(l.id)}
                            className="absolute -top-2 -right-2 hidden group-hover:flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow hover:bg-destructive/90"
                            title="Remover"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
}

export default QuickLinksView;