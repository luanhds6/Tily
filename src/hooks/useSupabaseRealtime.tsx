import { useEffect } from "react";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";

type MessageRow = {
  id: string;
  ticket_id: string;
  author_id: string;
  author_name: string;
  text: string | null;
  attachments: any[] | null;
  created_at: string;
};

export function useRealtimeMessages(onInsert: (row: MessageRow) => void) {
  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return;
    const channel = supabase
      .channel("messages_insert")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as MessageRow;
          onInsert(row);
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [onInsert]);
}