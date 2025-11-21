import { useEffect, useState } from "react";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";
import { useNotificationCenter } from "@/hooks/useNotificationCenter";
import { notify } from "@/hooks/useNotifications";

export type InformativoType = "Informativo" | "Alerta" | "Manutenção";

export type Informativo = {
  id: string;
  title: string;
  content: string;
  type: InformativoType;
  createdAt: string;
  createdBy: string;
  createdByName: string;
};

// Armazenamento local removido: informativos são gerenciados exclusivamente via Supabase

function uid(prefix = "i") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function useInformativos() {
  const [items, setItems] = useState<Informativo[]>([]);
  const { addNotification } = useNotificationCenter();

  // Load from Supabase when available
  useEffect(() => {
    const load = async () => {
      if (isSupabaseEnabled && supabase) {
        const { data, error } = await supabase
          .from("informativos")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) {
          console.error("Erro ao carregar informativos:", error);
          return;
        }
        setItems(
          (data || []).map((r: any) => ({
            id: r.id,
            title: r.title,
            content: r.content,
            type: (r.type as InformativoType) || "Informativo",
            createdAt: r.created_at,
            createdBy: r.created_by,
            createdByName: r.created_by_name,
          }))
        );
      }
    };
    load();
  }, []);

  // Sem persistência local

  // Subscribe to new informativos
  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return;
    const channel = supabase
      .channel("informativos_insert")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "informativos" },
        (payload) => {
          const r = payload.new as any;
          const info: Informativo = {
            id: r.id,
            title: r.title,
            content: r.content,
            type: (r.type as InformativoType) || "Informativo",
            createdAt: r.created_at,
            createdBy: r.created_by,
            createdByName: r.created_by_name,
          };
          setItems((prev) => [info, ...prev]);
          // Notify users
          notify(`${info.type}: ${info.title}`, { body: info.content.slice(0, 160) });
          addNotification({ title: `${info.type}: ${info.title}`, body: info.content, category: "informativo" });
        }
      )
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [addNotification]);

  const createInformativo = async (
    title: string,
    content: string,
    type: InformativoType,
    createdBy: string,
    createdByName: string
  ) => {
    const info: Informativo = {
      id: uid(),
      title,
      content,
      type,
      createdAt: new Date().toISOString(),
      createdBy,
      createdByName,
    };

    setItems((prev) => [info, ...prev]);
    addNotification({ title: `${type}: ${title}`, body: content, category: "informativo" });
    notify(`${type}: ${title}`, { body: content.slice(0, 160) });

    if (isSupabaseEnabled && supabase) {
      const { error } = await supabase.from("informativos").insert({
        id: info.id,
        title: info.title,
        content: info.content,
        type: info.type,
        created_at: info.createdAt,
        created_by: info.createdBy,
        created_by_name: info.createdByName,
      });
      if (error) console.error("Erro ao criar informativo:", error);
    }
  };

  return { items, createInformativo };
}