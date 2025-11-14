import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

type QuickTicketFloatingProps = {
  visible: boolean;
  onCreate: (payload: { title: string; description?: string; priority?: string; category?: string; tags?: string[]; attachments?: any[] }) => Promise<void> | void;
};

export default function QuickTicketFloating({ visible, onCreate }: QuickTicketFloatingProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("média");
  const [attachments, setAttachments] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (!visible) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      setSubmitting(true);
      await onCreate({ title: title.trim(), description: description.trim() || undefined, priority, attachments });
      // reset and close
      setTitle("");
      setDescription("");
      setPriority("média");
      setAttachments([]);
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files);
    list.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === "string" ? reader.result : undefined;
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type,
            size: file.size,
            // Para imagens, armazenamos dataUrl para preview rápido
            preview: dataUrl,
          },
        ]);
      };
      // Apenas lê conteúdo como dataUrl para imagens; outros arquivos ainda ganham metadata
      if (file.type.startsWith("image/")) {
        reader.readAsDataURL(file);
      } else {
        // Para não imagens, ainda adiciona sem dataUrl
        setAttachments((prev) => [
          ...prev,
          { name: file.name, type: file.type, size: file.size },
        ]);
      }
    });
  }, []);

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items || [];
    for (const item of items as any) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          handleFiles([file]);
        }
      }
    }
  }, [handleFiles]);

  return (
    <>
      {/* Floating button */}
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        className="fixed bottom-4 right-24 sm:right-28 z-50 px-4 py-3 rounded-full shadow-lg bg-primary text-white flex items-center gap-2"
        aria-label="Abrir Ticket Rápido"
      >
        <span className="inline-block w-2 h-2 rounded-full bg-white" />
        <span className="font-medium">Ticket Rápido</span>
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/40"
              onClick={() => !submitting && setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Card */}
            <motion.div
              role="dialog"
              aria-modal="true"
              className="relative w-[94vw] max-w-2xl rounded-2xl bg-white shadow-xl"
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
            >
              <div className="p-5 border-b">
                <h3 className="text-lg font-semibold">Abrir Ticket Rápido</h3>
                <p className="text-sm text-muted-foreground">Crie um chamado sem sair desta tela.</p>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4" onPaste={onPaste}>
                <div>
                  <label className="block text-sm font-medium mb-1">Título</label>
                  <input
                    className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ex.: Erro ao acessar o sistema"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Descrição (opcional)</label>
                  <textarea
                    className="w-full rounded-md border px-3 py-2 min-h-[140px] resize-y focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Descreva rapidamente o problema"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                {/* Attachments */}
                <div>
                  <label className="block text-sm font-medium mb-1">Anexos (opcional)</label>
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="file"
                      multiple
                      onChange={(e) => e.target.files && handleFiles(e.target.files)}
                    />
                    <span className="text-xs text-muted-foreground">Você pode colar prints diretamente aqui.</span>
                  </div>
                  {attachments.length > 0 && (
                    <div className="space-y-3">
                      {/* Image previews grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {attachments.filter((a) => a.preview).map((a, idx) => (
                          <div key={idx} className="border rounded-md overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={a.preview} alt={a.name} className="w-full h-32 object-cover" />
                            <div className="px-2 py-1 text-xs truncate">{a.name}</div>
                          </div>
                        ))}
                      </div>
                      {/* Other files list */}
                      <ul className="space-y-1">
                        {attachments.filter((a) => !a.preview).map((a, idx) => (
                          <li key={idx} className="text-sm text-foreground/80">
                            {a.name} <span className="text-muted-foreground text-xs">({a.type || "arquivo"})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Prioridade</label>
                  <select
                    className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="baixa">Baixa</option>
                    <option value="média">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-3 py-2 rounded-md border"
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-primary text-white"
                    disabled={submitting || !title.trim()}
                  >
                    {submitting ? "Enviando..." : "Abrir Ticket"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
