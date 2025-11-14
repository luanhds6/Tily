import React, { useState } from "react";
import { User as UserIcon, Mail, Shield, Calendar, Edit2, Save, X, ImagePlus, Trash2 } from "lucide-react";
import { Session, useAuth } from "../../hooks/useAuth";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Ticket } from "../../hooks/useTickets";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase, isSupabaseEnabled, ensureProfileForUser } from "@/lib/supabase";

interface ProfileViewProps {
  session: Session;
  tickets: Ticket[];
}

export function ProfileView({ session, tickets }: ProfileViewProps) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: session.name,
    email: session.email,
  });
  const { users, setMyAvatar, updateUser } = useAuth();
  const { refreshAuthUser, reloadProfile, profile } = useSupabaseAuth();
  const me = users.find((u) => u.id === session.id);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(me?.avatar || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const { toast } = useToast();
  const AVATARS_BUCKET = (import.meta.env.VITE_SUPABASE_AVATARS_BUCKET as string | undefined) ?? "avatars";

  async function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(blob);
    });
  }

  const myTickets = tickets.filter((t) => t.authorId === session.id);
  const myResolvedTickets = myTickets.filter((t) => t.status === "Resolvido" || t.status === "Fechado");

  // Mantém o formulário sincronizado com o nome do perfil quando disponível
  React.useEffect(() => {
    setFormData({ name: profile?.full_name ?? session.name, email: session.email });
  }, [profile?.full_name, session.name, session.email]);

  // Na inicialização, carrega avatar diretamente do banco (profiles.avatar_url)
  React.useEffect(() => {
    (async () => {
      if (isSupabaseEnabled && supabase) {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("avatar_url")
            .eq("user_id", session.id)
            .maybeSingle();
          if (!error) {
            const url = (data as any)?.avatar_url as string | undefined;
            if (url) setAvatarPreview(url);
          }
        } catch {}
      } else if (me?.avatar) {
        setAvatarPreview(me.avatar);
      }
    })();
  }, [isSupabaseEnabled, me?.avatar]);

  const avgResponseTime = myResolvedTickets.length > 0
    ? myResolvedTickets.reduce((acc, t) => {
        if (t.resolvedAt) {
          const diff = new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime();
          return acc + diff / (1000 * 60 * 60);
        }
        return acc;
      }, 0) / myResolvedTickets.length
    : 0;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
          <UserIcon className="w-8 h-8 text-primary" />
          Meu Perfil
        </h1>
        <p className="text-muted-foreground mt-1">Gerencie suas informações pessoais</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6 shadow-soft">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                {avatarPreview ? (
                  <AvatarImage src={avatarPreview} alt={(profile?.full_name ?? formData.name ?? session.name)} />
                ) : (
                  <AvatarFallback>{(profile?.full_name ?? formData.name ?? session.name).split(" ").map((n) => n[0]).join("").toUpperCase().slice(0,2)}</AvatarFallback>
                )}
              </Avatar>
              <div>
                <h2 className="text-xl font-bold text-foreground">{editing ? formData.name : (profile?.full_name ?? formData.name ?? session.name)}</h2>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                  session.role === "master" ? "bg-warning/10 text-warning" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {session.role === "master" ? "Master" : "Usuário"}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setEditing(!editing)}>
              {editing ? <X className="w-5 h-5 text-muted-foreground" /> : <Edit2 className="w-5 h-5 text-muted-foreground" />}
            </Button>
          </div>

          {editing ? (
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-input bg-background px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  readOnly
                  disabled
                  className="w-full border border-input bg-muted px-3 py-2 rounded-lg cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">O e-mail é gerenciado pelo Auth e não pode ser alterado aqui.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Foto de perfil</label>
                <div className="flex items-center gap-3">
                  <Avatar className="w-16 h-16">
                    {avatarPreview ? (
                      <AvatarImage src={avatarPreview} alt={session.name} />
                    ) : (
                      <AvatarFallback>{session.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0,2)}</AvatarFallback>
                    )}
                  </Avatar>
                  <label className="inline-flex items-center gap-2 px-3 py-2 border border-input rounded-lg cursor-pointer hover:bg-muted/50">
                    <ImagePlus className="w-4 h-4" />
                    <span>Escolher imagem</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setAvatarFile(file);
                        const objectUrl = URL.createObjectURL(file);
                        setAvatarPreview(objectUrl);
                      }}
                    />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground mt-1">PNG/JPEG até ~1MB recomendado.</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  onClick={async () => {
                    try {
                      // Atualiza avatar local imediatamente para feedback visual
                      if (avatarPreview) setMyAvatar(avatarPreview);

                       // Se Supabase estiver habilitado, atualiza tabela profiles (sem metadata)
                       if (isSupabaseEnabled && supabase) {
                        let publicAvatarUrl: string | null = null;
                        if (avatarFile) {
                          // Compressão da imagem antes do upload (WEBP ~0.8, máx 512px)
                          async function compressImage(file: File, maxSize = 512, quality = 0.8): Promise<{ blob: Blob; ext: string }>{
                            const img = document.createElement("img");
                            const url = URL.createObjectURL(file);
                            img.src = url;
                            await new Promise((res, rej) => {
                              img.onload = () => res(null);
                              img.onerror = () => rej(new Error("Falha ao carregar imagem"));
                            });
                            const canvas = document.createElement("canvas");
                            const { naturalWidth: w, naturalHeight: h } = img;
                            const scale = Math.min(1, maxSize / Math.max(w, h));
                            canvas.width = Math.round(w * scale);
                            canvas.height = Math.round(h * scale);
                            const ctx = canvas.getContext("2d");
                            if (!ctx) throw new Error("Canvas não suportado");
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                            const ext = "webp";
                            const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/webp", quality));
                            URL.revokeObjectURL(url);
                            return { blob: blob ?? file, ext };
                          }

                          const { blob: compressed, ext: outExt } = await compressImage(avatarFile);
                          const path = `${profile?.company_id ?? "_"}/${session.id}/${Date.now()}.${outExt}`;
                          const { error: upErr } = await supabase.storage.from(AVATARS_BUCKET).upload(path, compressed, { upsert: true });
                          if (upErr) {
                            const msg = (upErr.message || "").toLowerCase();
                            // Fallback: bucket não existe – salva avatar diretamente no banco como data URL
                            if (msg.includes("bucket not found")) {
                              const dataUrl = await blobToDataUrl(compressed);
                              publicAvatarUrl = dataUrl;
                            } else {
                              throw upErr;
                            }
                          } else {
                            const { data: pub } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
                            publicAvatarUrl = pub?.publicUrl ?? null;
                          }
                          if (publicAvatarUrl) {
                            setMyAvatar(publicAvatarUrl);
                          }
                        }
                        // Garante que o perfil exista antes de atualizar
                        await ensureProfileForUser({ id: session.id, email: session.email });
                        // Atualiza tabela profiles com o novo nome e avatar_url (quando disponível)
                        const payload: Record<string, unknown> = { full_name: formData.name };
                        if (publicAvatarUrl !== null) {
                          (payload as any).avatar_url = publicAvatarUrl;
                        }
                        let { error: profErr } = await supabase
                          .from("profiles")
                          .update(payload)
                          .eq("user_id", session.id);
                        if (profErr) {
                          const msg = (profErr.message || "").toLowerCase();
                          // Fallback quando a coluna avatar_url ainda não existe no banco
                          if (msg.includes("avatar_url") && msg.includes("column") && msg.includes("does not exist")) {
                            const { error: profErr2 } = await supabase
                              .from("profiles")
                              .update({ full_name: formData.name })
                              .eq("user_id", session.id);
                            if (profErr2) throw profErr2;
                          } else {
                            throw profErr;
                          }
                        }

                        // Removido: não atualiza e-mail via Supabase Auth. Apenas nome/avatar no banco.

                         toast({ title: "Perfil atualizado", description: "Suas alterações foram salvas no banco." });
                         // Recarrega o profile para refletir o novo nome/avatar
                         await reloadProfile();
                       } else {
                         // Fallback: atualiza store local quando Supabase não está configurado (somente nome)
                         updateUser(session.id, { name: formData.name });
                         toast({ title: "Perfil atualizado", description: "Alterações salvas localmente." });
                       }
                       setEditing(false);
                     } catch (err: any) {
                       toast({ title: "Falha ao salvar perfil", description: err?.message ?? "Erro inesperado" });
                     }
                   }}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar
                </Button>
                <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="gap-2"
                  onClick={async () => {
                    try {
                      setAvatarPreview(null);
                      setAvatarFile(null);
                      setMyAvatar("");
                      if (isSupabaseEnabled && supabase) {
                        // Carrega avatar atual para remover do Storage, se existir
                        const { data, error } = await supabase
                          .from("profiles")
                          .select("avatar_url")
                          .eq("user_id", session.id)
                          .maybeSingle();
                        if (!error) {
                          const currentUrl = (data as any)?.avatar_url as string | undefined;
                          if (currentUrl) {
                            // Extrai o caminho do arquivo do public URL
                            const marker = `/object/public/${AVATARS_BUCKET}/`;
                            const idx = currentUrl.indexOf(marker);
                            if (idx !== -1) {
                              const objectPath = currentUrl.slice(idx + marker.length);
                              await supabase.storage.from(AVATARS_BUCKET).remove([objectPath]);
                            } else if (currentUrl.startsWith("data:")) {
                              // Avatar salvo como data URL – nada para remover do Storage
                            } else {
                              // Caso desconhecido: ignora remoção no storage
                            }
                          }
                        }
                        // Zera avatar_url no banco
                        const { error: profErr } = await supabase
                          .from("profiles")
                          .update({ avatar_url: null } as any)
                          .eq("user_id", session.id);
                        if (profErr) throw profErr;
                        await reloadProfile();
                      }
                      toast({ title: "Foto removida", description: "Seu perfil voltou às iniciais." });
                    } catch (err: any) {
                      toast({ title: "Falha ao remover foto", description: err?.message ?? "Erro inesperado" });
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Remover foto
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium text-foreground">{session.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Função</p>
                  <p className="text-sm font-medium text-foreground">
                    {session.role === "master" ? "Master" : "Usuário"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Membro desde</p>
                  <p className="text-sm font-medium text-foreground">Janeiro 2025</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Card */}
        <div className="space-y-4">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 shadow-soft">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Meus Chamados</h3>
            <p className="text-4xl font-bold text-primary">{myTickets.length}</p>
          </div>
          <div className="bg-success/5 border border-success/20 rounded-lg p-6 shadow-soft">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Resolvidos</h3>
            <p className="text-4xl font-bold text-success">{myResolvedTickets.length}</p>
          </div>
          <div className="bg-warning/5 border border-warning/20 rounded-lg p-6 shadow-soft">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Tempo Médio</h3>
            <p className="text-4xl font-bold text-warning">{Math.round(avgResponseTime * 10) / 10}h</p>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-foreground mb-4">Segurança</h3>
        <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-2">
          <Button variant="outline" className="w-full sm:w-auto text-sm">Alterar Senha</Button>
          <Button variant="outline" className="w-full sm:w-auto text-sm">Autenticação em Dois Fatores</Button>
        </div>
      </div>
    </div>
  );
}
