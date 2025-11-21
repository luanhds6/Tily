import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Category = { id: string; name: string; description?: string | null };

const RESOURCE_KEYS: { key: string; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "tickets", label: "Chamados" },
  { key: "chat", label: "Chat" },
  { key: "profile", label: "Perfil" },
  { key: "settings", label: "Preferências" },
  { key: "users_management", label: "Gestão de Usuários" },
  { key: "analytics", label: "Analytics" },
  { key: "knowledge", label: "Base de Conhecimento" },
  { key: "informativos", label: "Informativos" },
  { key: "quick_links", label: "Links Rápidos" },
];

export default function AccessCategoriesView() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const selected = useMemo(() => categories.find((c) => c.id === selectedId) || null, [categories, selectedId]);

  async function loadCategories() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from("access_categories").select("id,name,description").order("name");
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setCategories(data || []);
    }
  }

  async function loadPermissions(categoryId: string) {
    const { data, error } = await supabase
      .from("access_category_permissions")
      .select("resource_key, allow")
      .eq("category_id", categoryId);
    if (!error) {
      const map: Record<string, boolean> = {};
      for (const { resource_key, allow } of (data || []) as Array<{ resource_key: string; allow: boolean }>) {
        map[resource_key] = !!allow;
      }
      setPerms(map);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadPermissions(selectedId);
    } else {
      setPerms({});
    }
  }, [selectedId]);

  async function createCategory() {
    if (!newName.trim()) return;
    const { data, error } = await supabase
      .from("access_categories")
      .insert({ name: newName.trim(), description: newDesc || null })
      .select();
    if (error) {
      setError(error.message);
      return;
    }
    setNewName("");
    setNewDesc("");
    setCategories((prev) => [...prev, ...(data || [])]);
  }

  function toggle(key: string) {
    setPerms((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function savePermissions() {
    if (!selectedId) return;
    const rows = RESOURCE_KEYS.map(({ key }) => ({ category_id: selectedId, resource_key: key, allow: !!perms[key] }));
    const { error } = await supabase.from("access_category_permissions").upsert(rows, { onConflict: "category_id,resource_key" });
    if (error) {
      setError(error.message);
    }
  }

  async function deleteCategory(id: string) {
    // Remove categoria e suas permissões associadas
    await supabase.from("access_category_permissions").delete().eq("category_id", id);
    const { error } = await supabase.from("access_categories").delete().eq("id", id);
    if (!error) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setPerms({});
      }
    }
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="text-xl font-semibold">Categorias de Acesso</h2>
        <p className="text-sm text-muted-foreground">Defina quais páginas usuários comuns podem acessar.</p>
      </div>

      {error && <div className="text-red-600 text-sm">Erro: {error}</div>}
      {loading && <div className="text-muted-foreground">Carregando...</div>}

      {/* Create Category */}
      <div className="border rounded-md p-3">
        <div className="font-medium mb-2">Nova Categoria</div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Nome</label>
            <input className="w-full border rounded px-2 py-1" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Descrição</label>
            <input className="w-full border rounded px-2 py-1" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          </div>
        </div>
        <div className="mt-3">
          <button className="px-3 py-1 border rounded hover:bg-accent" onClick={createCategory}>Criar</button>
        </div>
      </div>

      {/* Categories list */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-1 border rounded-md overflow-hidden">
          <div className="p-3 bg-muted font-medium">Categorias</div>
          <ul>
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-3 py-2 border-t">
                <button className="text-left flex-1 hover:text-primary" onClick={() => setSelectedId(c.id)}>
                  <div className="font-medium">{c.name}</div>
                  {c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}
                </button>
                <button className="text-xs px-2 py-1 border rounded hover:bg-destructive/10 text-destructive" onClick={() => deleteCategory(c.id)}>Excluir</button>
              </li>
            ))}
            {categories.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">Nenhuma categoria criada</li>
            )}
          </ul>
        </div>

        <div className="md:col-span-2 border rounded-md">
          <div className="p-3 bg-muted font-medium">Permissões da Categoria</div>
          {selected ? (
            <div className="p-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {RESOURCE_KEYS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2">
                  <input type="checkbox" checked={!!perms[key]} onChange={() => toggle(key)} />
                  <span>{label}</span>
                </label>
              ))}
              <div className="sm:col-span-2 lg:col-span-3 mt-2">
                <button className="px-3 py-1 border rounded hover:bg-accent" onClick={savePermissions}>Salvar</button>
              </div>
            </div>
          ) : (
            <div className="p-3 text-sm text-muted-foreground">Selecione uma categoria para editar.</div>
          )}
        </div>
      </div>
    </div>
  );
}