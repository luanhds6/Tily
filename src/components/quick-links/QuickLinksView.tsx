import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useAccessControl } from "@/hooks/useAccessControl";
import { Session } from "@/hooks/useAuth";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase, isSupabaseEnabled, getCurrentCompany } from "@/lib/supabase";
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
  folderId?: string; // undefined => link avulso (público)
};

type QuickLinkFolder = {
  id: string;
  name: string;
  visibility: "public" | "restricted"; // restricted => apenas master e usuários permitidos
  createdAt: string;
  allowedUserIds?: string[]; // IDs de usuários com acesso quando restricted
  links?: QuickLink[]; // links pertencentes exclusivamente à pasta
};

const LS_QUICK_LINKS = "sc_quick_links_v1";
const LS_QUICK_LINK_FOLDERS = "sc_quick_link_folders_v1";

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

function loadLinksLocal(): QuickLink[] {
  try {
    const raw = localStorage.getItem(LS_QUICK_LINKS);
    return raw ? (JSON.parse(raw) as QuickLink[]) : [];
  } catch {
    return [];
  }
}

function saveLinksLocal(links: QuickLink[]) {
  try {
    localStorage.setItem(LS_QUICK_LINKS, JSON.stringify(links));
  } catch {}
}

function loadFoldersLocal(): QuickLinkFolder[] {
  try {
    const raw = localStorage.getItem(LS_QUICK_LINK_FOLDERS);
    return raw ? (JSON.parse(raw) as QuickLinkFolder[]) : [];
  } catch {
    return [];
  }
}

function saveFoldersLocal(folders: QuickLinkFolder[]) {
  try {
    localStorage.setItem(LS_QUICK_LINK_FOLDERS, JSON.stringify(folders));
  } catch {}
}

export function QuickLinksView({ session }: { session: Session | null }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(true);
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [folders, setFolders] = useState<QuickLinkFolder[]>([]);
  // Para concessão de acesso por pasta
  const { listProfilesByCompany } = useSupabaseAuth();
  const [companyUsers, setCompanyUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [grantUserByFolder, setGrantUserByFolder] = useState<Record<string, string>>({});

  // Usa a role efetiva do hook de controle de acesso
  const access = useAccessControl(session);
const isAdmin = (access?.perms?.role === "master");

  // Form state
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [iconKey, setIconKey] = useState<keyof typeof ICONS_MAP>("link");
  const [saving, setSaving] = useState(false);
  // Pasta: criação e adição de link
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderVisibility, setNewFolderVisibility] = useState<QuickLinkFolder["visibility"]>("public");
  const [addingLinkInFolderId, setAddingLinkInFolderId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      // Se Supabase estiver habilitado, carrega do banco por empresa
      if (isSupabaseEnabled && supabase) {
        try {
          const { data: company, error: compErr } = await getCurrentCompany();
          if (compErr || !company) {
            setLinks(loadLinksLocal());
            setFolders(loadFoldersLocal());
            return;
          }
          const { data, error } = await (supabase as any)
            .from("quick_links")
            .select("id,title,url,icon,created_at")
            .eq("company_id", company.id)
            .order("created_at", { ascending: false });
          if (error) {
            setLinks(loadLinksLocal());
            setFolders(loadFoldersLocal());
            return;
          }
          const mapped: QuickLink[] = (data ?? []).map((row: any) => ({
            id: row.id,
            title: row.title,
            url: row.url,
            icon: row.icon || "link",
          }));
          if (active) {
            setLinks(mapped);
            // cache local para fallback rápido
            saveLinksLocal(mapped);
            // Pastas são gerenciadas localmente por enquanto
            const localFolders = loadFoldersLocal();
            // Normaliza estrutura: garante allowedUserIds
            const normalized = (localFolders || []).map((f) => ({
              ...f,
              allowedUserIds: f.allowedUserIds ?? [],
              links: f.links ?? [],
            }));
            setFolders(normalized);
          }
          return;
        } catch {
          setLinks(loadLinksLocal());
          const localFolders = loadFoldersLocal();
          const normalized = (localFolders || []).map((f) => ({
            ...f,
            allowedUserIds: f.allowedUserIds ?? [],
            links: f.links ?? [],
          }));
          setFolders(normalized);
          return;
        }
      }
      // Fallback: localStorage
      setLinks(loadLinksLocal());
      const localFolders = loadFoldersLocal();
      const normalized = (localFolders || []).map((f) => ({
        ...f,
        allowedUserIds: f.allowedUserIds ?? [],
        links: f.links ?? [],
      }));
      setFolders(normalized);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  // Carrega usuários da empresa para concessão de acesso nas pastas
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await listProfilesByCompany();
        if (error) return;
        if (!mounted) return;
        const mapped = (data || []).map((u: any) => ({ id: u.user_id, name: u.full_name || u.email || "Usuário" }));
        setCompanyUsers(mapped);
      } catch {}
    })();
    return () => { mounted = false; };
  }, [listProfilesByCompany]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    if (!title.trim() || !url.trim()) {
      toast({ title: "Preencha nome e URL", description: "Campos obrigatórios", variant: "default" });
      setSaving(false);
      return;
    }
    const baseNew = {
      title: title.trim(),
      url: url.trim(),
      icon: iconKey,
    };

    // Supabase: salvar no banco
    if (isSupabaseEnabled && supabase) {
      try {
        const { data: company } = await getCurrentCompany();
        if (company?.id) {
          const { data, error } = await (supabase as any)
            .from("quick_links")
            .insert({ ...baseNew, company_id: company.id })
            .select("id,title,url,icon,created_at")
            .maybeSingle();
          if (error) throw error;
          const newLink: QuickLink = {
            id: data.id,
            title: data.title,
            url: data.url,
            icon: data.icon || "link",
            folderId: undefined,
          };
          const next = [newLink, ...links];
          setLinks(next);
          saveLinksLocal(next);
          setTitle("");
          setUrl("");
          toast({ title: "Link adicionado", description: `${newLink.title} (salvo no Supabase)` });
          setSaving(false);
          return;
        }
      } catch (err: any) {
        toast({ title: "Falha ao salvar no Supabase", description: err?.message ?? "Erro inesperado" });
      }
    }

    // Fallback local
    const newLink: QuickLink = { id: Math.random().toString(36).slice(2), folderId: undefined, ...baseNew };
    const next = [newLink, ...links];
    setLinks(next);
    saveLinksLocal(next);
    setTitle("");
    setUrl("");
    toast({ title: "Link adicionado", description: `${newLink.title} (salvo localmente)` });
    setSaving(false);
  };

  const handleRemove = async (id: string) => {
    // Supabase: remover do banco
    if (isSupabaseEnabled && supabase) {
      try {
        const { error } = await (supabase as any)
          .from("quick_links")
          .delete()
          .eq("id", id);
        if (error) throw error;
      } catch (err: any) {
        toast({ title: "Falha ao remover no Supabase", description: err?.message ?? "Erro inesperado" });
        return;
      }
    }
    const next = links.filter((l) => l.id !== id);
    setLinks(next);
    saveLinksLocal(next);
    toast({ title: "Link removido" });
  };

  const IconComponent = useMemo(() => ICONS_MAP[iconKey], [iconKey]);
  // Usuários não administradores podem ver os links públicos e pastas públicas

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Links Úteis</h2>
      </div>
      {/* Grid de duas colunas: esquerda (pastas), direita (links avulsos) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Coluna Esquerda: Pastas */}
        <div className="space-y-6">
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Criar pasta</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  className="grid grid-cols-1 md:grid-cols-5 gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const name = newFolderName.trim();
                    if (!name) {
                      toast({ title: "Informe o nome da pasta" });
                      return;
                    }
                const folder: QuickLinkFolder = {
                  id: Math.random().toString(36).slice(2),
                  name,
                  visibility: newFolderVisibility,
                  createdAt: new Date().toISOString(),
                  allowedUserIds: [],
                };
                const next = [folder, ...folders];
                setFolders(next);
                saveFoldersLocal(next);
                setNewFolderName("");
                    toast({ title: "Pasta criada", description: folder.name });
                  }}
                >
                  <div className="md:col-span-3">
                    <label className="text-sm font-medium mb-1 block">Nome da pasta</label>
                    <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Ex: Sistemas internos" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium mb-1 block">Visibilidade</label>
                    <Select value={newFolderVisibility} onValueChange={(v) => setNewFolderVisibility(v as QuickLinkFolder["visibility"]) }>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Todos</SelectItem>
                        <SelectItem value="restricted">Somente master</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-5">
                    <Button type="submit" className="w-full md:w-auto">Adicionar pasta</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Lista de pastas */}
          {folders.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Pastas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Nenhuma pasta criada ainda.</p>
              </CardContent>
            </Card>
          ) : (
            folders
              .filter((f) => f.visibility === "public" || isAdmin || (!!session?.id && (f.allowedUserIds ?? []).includes(session.id)))
              .map((folder) => {
                const folderLinks = folder.links ?? [];
                return (
                  <Card key={folder.id}>
                    <CardHeader className="p-0">
                      <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Bookmark className="w-5 h-5" />
                          <span className="font-medium">{folder.name}</span>
                          <span className="text-xs text-muted-foreground">• {folder.visibility === "public" ? "Todos" : "Restrita"}</span>
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAddingLinkInFolderId((prev) => (prev === folder.id ? null : folder.id))}
                            >
                              Adicionar link
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive border-destructive/40"
                              title="Excluir pasta"
                              onClick={() => {
                                const confirmed = window.confirm("Deseja realmente excluir esta pasta? Os links serão movidos para 'Acesso rápido'.");
                                if (!confirmed) return;
                                // Remove pasta e migra links para avulsos
                                const nextFolders = folders.filter((f) => f.id !== folder.id);
                                const migrated = (folder.links ?? []).map((l) => ({ ...l, folderId: undefined }));
                                const nextLinks = [...migrated, ...links];
                                setFolders(nextFolders);
                                setLinks(nextLinks);
                                saveFoldersLocal(nextFolders);
                                saveLinksLocal(nextLinks);
                                toast({ title: "Pasta excluída", description: `Links migrados para Acesso rápido` });
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {isAdmin && folder.visibility === "restricted" && (
                        <div className="mb-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Acesso permitido</span>
                          </div>
                          {(folder.allowedUserIds ?? []).length === 0 ? (
                            <p className="text-xs text-muted-foreground">Nenhum usuário autorizado ainda.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {(folder.allowedUserIds ?? []).map((uid) => {
                                const u = companyUsers.find((x) => x.id === uid);
                                return (
                                  <div key={uid} className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs">
                                    <span>{u?.name || uid}</span>
                                    <button
                                      className="rounded-full bg-destructive text-destructive-foreground h-5 w-5 flex items-center justify-center"
                                      title="Remover acesso"
                                      onClick={() => {
                                        const nextFolders = folders.map((f) => (
                                          f.id === folder.id
                                            ? { ...f, allowedUserIds: (f.allowedUserIds ?? []).filter((id) => id !== uid) }
                                            : f
                                        ));
                                        setFolders(nextFolders);
                                        saveFoldersLocal(nextFolders);
                                      }}
                                    >
                                      ×
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                            <div className="md:col-span-4">
                              <label className="text-xs font-medium mb-1 block">Conceder acesso a um usuário</label>
                              <Select
                                value={grantUserByFolder[folder.id] || ""}
                                onValueChange={(v) => setGrantUserByFolder((prev) => ({ ...prev, [folder.id]: v }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecionar usuário" />
                                </SelectTrigger>
                                <SelectContent>
                                  {companyUsers.map((u) => (
                                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="md:col-span-1 flex items-end">
                              <Button
                                variant="secondary"
                                className="w-full"
                                onClick={() => {
                                  const sel = grantUserByFolder[folder.id];
                                  if (!sel) return;
                                  if ((folder.allowedUserIds ?? []).includes(sel)) return;
                                  const nextFolders = folders.map((f) => (
                                    f.id === folder.id
                                      ? { ...f, allowedUserIds: [...(f.allowedUserIds ?? []), sel] }
                                      : f
                                  ));
                                  setFolders(nextFolders);
                                  saveFoldersLocal(nextFolders);
                                  setGrantUserByFolder((prev) => ({ ...prev, [folder.id]: "" }));
                                  toast({ title: "Acesso concedido", description: "Usuário autorizado para a pasta" });
                                }}
                              >
                                Conceder
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                      {isAdmin && addingLinkInFolderId === folder.id && (
                        <form
                          className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4"
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (!title.trim() || !url.trim()) {
                              toast({ title: "Preencha nome e URL" });
                              return;
                            }
                            // Pastas: por enquanto armazenadas localmente
                            const newLink: QuickLink = {
                              id: Math.random().toString(36).slice(2),
                              title: title.trim(),
                              url: url.trim(),
                              icon: iconKey,
                            };
                            const nextFolders = folders.map((f) => (
                              f.id === folder.id
                                ? { ...f, links: [newLink, ...(f.links ?? [])] }
                                : f
                            ));
                            setFolders(nextFolders);
                            saveFoldersLocal(nextFolders);
                            setTitle("");
                            setUrl("");
                            setAddingLinkInFolderId(null);
                            toast({ title: "Link adicionado na pasta", description: newLink.title });
                          }}
                        >
                          <div className="md:col-span-2">
                            <label className="text-sm font-medium mb-1 block">Nome</label>
                            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Intranet" />
                          </div>
                          <div className="md:col-span-3">
                            <label className="text-sm font-medium mb-1 block">URL</label>
                            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://exemplo.com" />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">Ícone</label>
                            <Select value={iconKey} onValueChange={(v) => setIconKey(v as keyof typeof ICONS_MAP)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Ícone" />
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
                      )}

                      {folderLinks.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum link nesta pasta.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                          {folderLinks.map((l) => {
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
                                    onClick={() => {
                                      const next = links.filter((x) => x.id !== l.id);
                                      setLinks(next);
                                      saveLinksLocal(next);
                                      toast({ title: "Link removido" });
                                    }}
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
                    </CardContent>
                  </Card>
                );
              })
          )}
        </div>

        {/* Coluna Direita: Links avulsos (públicos) */}
        <div className="space-y-6">
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Cadastrar link avulso (público)</CardTitle>
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
                  {links.filter((l) => !l.folderId).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum link cadastrado ainda.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {links.filter((l) => !l.folderId).map((l) => {
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
      </div>
    </div>
  );
}

export default QuickLinksView;
