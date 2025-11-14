import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Tabs removidos: coluna direita passa a mostrar criação de sala e histórico
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Session } from "@/hooks/useAuth";
import { useMeetingRoom } from "@/hooks/useMeetingRoom";
import { useChat } from "@/hooks/useChat";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";
import { Video, Mic, MicOff, Camera, CameraOff, ScreenShare, Hand, MessageSquare, X, Expand, Minimize, PhoneOff, LockKeyhole, Plus, Trash2, History } from "lucide-react";

type MeetingsPageProps = {
  session: Session;
};

export default function MeetingsPage({ session }: MeetingsPageProps) {
  const [roomName, setRoomName] = useState<string>("sala-geral");
  const [joined, setJoined] = useState<boolean>(false);
  const [showChat, setShowChat] = useState<boolean>(true);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [newRoomName, setNewRoomName] = useState<string>("");
  const [newRoomPassword, setNewRoomPassword] = useState<string>("");
  const ROOMS_KEY = "meeting_rooms_v1";
  const [rooms, setRooms] = useState<Array<{ id: string; name: string; password?: string | null; createdBy: string; createdAt: string }>>(() => {
    try { return JSON.parse(localStorage.getItem(ROOMS_KEY) || "[]"); } catch { return []; }
  });
  const HISTORY_KEY = "meeting_history_v1";
  const [history, setHistory] = useState<Array<{ roomId: string; roomName: string; topic: string | null; endedAt: string }>>(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
  });

  const roomId = useMemo(() => roomName.trim().toLowerCase().replace(/\s+/g, "-"), [roomName]);
  const {
    joined: isJoined,
    error,
    localStream,
    remotePeers,
    muted,
    cameraOn,
    screenSharing,
    handRaised,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    toggleHand,
  } = useMeetingRoom({ userId: session.id, userName: session.name, roomId });

  useEffect(() => setJoined(isJoined), [isJoined]);

  const { messages, sendMessage, setRoomId } = useChat(roomId);
  useEffect(() => setRoomId(roomId), [roomId, setRoomId]);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [recording, setRecording] = useState<boolean>(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordStreamRef = useRef<MediaStream | null>(null);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadStatus("");
    const folder = roomId || "default";
    for (const file of Array.from(files)) {
      try {
        if (isSupabaseEnabled && supabase) {
          const { data, error } = await supabase.storage.from("meetings").upload(`${folder}/${Date.now()}_${file.name}`, file, { upsert: true });
          if (error) throw error;
          setUploadStatus((s) => s + `\nEnviado para Supabase: ${data?.path}`);
        } else {
          const reader = new FileReader();
          reader.onloadend = () => {
            try {
              const key = `meetings_local_${folder}`;
              const prev = JSON.parse(localStorage.getItem(key) || "[]");
              prev.push({ name: file.name, size: file.size, dataUrl: reader.result, uploadedAt: new Date().toISOString() });
              localStorage.setItem(key, JSON.stringify(prev));
              setUploadStatus((s) => s + `\nSalvo localmente: ${file.name}`);
            } catch { setUploadStatus((s) => s + `\nFalha ao salvar local: ${file.name}`); }
          };
          reader.readAsDataURL(file);
        }
      } catch (e: any) {
        setUploadStatus((s) => s + `\nErro ao enviar ${file.name}: ${e?.message || e}`);
      }
    }
  };

  const sampleRooms = ["Sala Geral", "TI Daily", "Vendas", "Operações", "Diretoria"]; // usuários podem criar nome livre

  function persistRooms(next: typeof rooms) {
    setRooms(next);
    try { localStorage.setItem(ROOMS_KEY, JSON.stringify(next)); } catch {}
  }

  function createRoom() {
    const name = newRoomName.trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/\s+/g, "-");
    const exists = rooms.some((r) => r.id === id);
    const entry = { id, name, password: newRoomPassword.trim() || null, createdBy: session.id, createdAt: new Date().toISOString() };
    const next = exists ? rooms.map((r) => (r.id === id ? entry : r)) : [entry, ...rooms];
    persistRooms(next);
    setRoomName(name);
    setNewRoomName("");
    setNewRoomPassword("");
    setCreating(false);
  }

  function deleteRoomByName(nameInput?: string) {
    const raw = (nameInput ?? newRoomName ?? "").trim() || roomName.trim();
    if (!raw) return;
    const id = raw.toLowerCase().replace(/\s+/g, "-");
    const exists = rooms.some((r) => r.id === id);
    if (!exists) return;
    const next = rooms.filter((r) => r.id !== id);
    persistRooms(next);
    if (roomId === id) {
      setRoomName("");
    }
  }

  async function tryJoinSelectedRoom(id: string, name: string) {
    const info = rooms.find((r) => r.id === id);
    if (info?.password) {
      const input = window.prompt(`Esta sala é protegida. Informe a senha para entrar em "${name}":`) || "";
      if (input !== info.password) {
        alert("Senha incorreta");
        return;
      }
    }
    setRoomName(name);
    // Não entrar automaticamente; o usuário deve clicar em "Abrir reunião instantânea"
  }

  function addHistoryEntry(topic?: string | null) {
    const entry = { roomId, roomName, topic: (topic || "").trim() || null, endedAt: new Date().toISOString() };
    try {
      const prev = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      const next = [entry, ...prev];
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      setHistory(next);
    } catch {
      setHistory((h) => [entry, ...h]);
    }
  }

  async function endMeeting() {
    try {
      const topic = window.prompt("Informe o tópico da reunião ao encerrar (opcional):") || "";
      addHistoryEntry(topic);
    } finally {
      leaveRoom();
    }
  }

  async function startRecording() {
    try {
      const display = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true });
      recordStreamRef.current = display as MediaStream;
      const mimeCandidates = [
        "video/mp4",
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
      ];
      const mime = mimeCandidates.find((m) => (window as any).MediaRecorder && MediaRecorder.isTypeSupported(m)) || "video/webm";
      const rec = new MediaRecorder(recordStreamRef.current!, { mimeType: mime });
      recordedChunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: mime });
        const ext = mime.includes("mp4") ? "mp4" : "webm";
        await saveRecordingBlob(blob, ext);
        if (recordStreamRef.current) {
          recordStreamRef.current.getTracks().forEach((t) => t.stop());
          recordStreamRef.current = null;
        }
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch (e: any) {
      setUploadStatus((s) => s + `\nFalha ao iniciar gravação: ${e?.message || e}`);
    }
  }

  async function stopRecording() {
    try {
      recorderRef.current?.stop();
    } finally {
      setRecording(false);
    }
  }

  async function saveRecordingBlob(blob: Blob, ext: string) {
    const folder = roomId || "default";
    // Garantir MP4: se não for mp4, tenta converter via ffmpeg.wasm
    let targetBlob = blob;
    let targetExt = ext;
    try {
      if (ext !== "mp4") {
        setUploadStatus((s) => s + "\nConvertendo para MP4...");
        const converted = await convertToMp4(blob);
        if (converted) {
          targetBlob = converted;
          targetExt = "mp4";
          setUploadStatus((s) => s + "\nConversão para MP4 concluída.");
        } else {
          setUploadStatus((s) => s + "\nConversão para MP4 indisponível; mantendo formato original.");
        }
      }
    } catch (e: any) {
      setUploadStatus((s) => s + `\nFalha na conversão: ${e?.message || e}. Usando formato original.`);
    }
    const filename = `recording_${Date.now()}.${targetExt}`;
    try {
      if (isSupabaseEnabled && supabase) {
        const { data, error } = await supabase.storage.from("meetings").upload(`${folder}/recordings/${filename}`, targetBlob, { upsert: true, contentType: targetBlob.type });
        if (error) throw error;
        setUploadStatus((s) => s + `\nGravação enviada: ${data?.path}`);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          try {
            const key = `meetings_local_${folder}`;
            const prev = JSON.parse(localStorage.getItem(key) || "[]");
            prev.push({ name: filename, type: targetBlob.type, dataUrl: reader.result, uploadedAt: new Date().toISOString(), recording: true });
            localStorage.setItem(key, JSON.stringify(prev));
            setUploadStatus((s) => s + `\nGravação salva localmente: ${filename}`);
          } catch { setUploadStatus((s) => s + `\nFalha ao salvar gravação local`); }
        };
        reader.readAsDataURL(targetBlob);
      }
    } catch (e: any) {
      setUploadStatus((s) => s + `\nErro ao salvar gravação: ${e?.message || e}`);
    }
  }

  async function convertToMp4(srcBlob: Blob): Promise<Blob | null> {
    try {
      const { createFFmpeg, fetchFile } = await import("@ffmpeg/ffmpeg");
      const ffmpeg = createFFmpeg({ log: false, progress: (p: any) => {
        if (p && typeof p.ratio === "number") {
          const pct = Math.round(p.ratio * 100);
          setUploadStatus((s) => s + `\nTranscodificando... ${pct}%`);
        }
      }});
      await ffmpeg.load();
      const inputName = "input.webm";
      const outputName = "output.mp4";
      const arrBuf = await srcBlob.arrayBuffer();
      ffmpeg.FS("writeFile", inputName, new Uint8Array(arrBuf));
      // Conversão para MP4 (H.264 + AAC) com parâmetros razoáveis
      await ffmpeg.run(
        "-i", inputName,
        "-c:v", "libx264",
        "-preset", "fast",
        "-movflags", "faststart",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        outputName
      );
      const data = ffmpeg.FS("readFile", outputName);
      // Cleanup
      try { ffmpeg.FS("unlink", inputName); } catch {}
      try { ffmpeg.FS("unlink", outputName); } catch {}
      return new Blob([data.buffer], { type: "video/mp4" });
    } catch (e) {
      console.warn("FFmpeg wasm indisponível ou falha na conversão:", e);
      return null;
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className={`grid gap-4 ${expanded ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-[1.6fr_1fr]"} h-[calc(100vh-5rem)]`}>
        {/* Esquerda: Salas + Chamada de vídeo */}
        <div className="flex flex-col gap-4 h-full">
          <Card className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input className="flex-1 min-w-[220px]" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Nome da sala" />
              {!joined ? (
                <Button className="w-full sm:w-auto" onClick={joinRoom} title="Abrir reunião instantânea"><Video className="w-4 h-4 mr-2" /> Abrir reunião instantânea</Button>
              ) : (
                <Button className="w-full sm:w-auto" variant="destructive" onClick={endMeeting} title="Encerrar reunião"><PhoneOff className="w-4 h-4 mr-2" /> Encerrar</Button>
              )}
              {joined && (
                <>
                  <Button variant="outline" onClick={() => setExpanded((e) => !e)} title={expanded ? "Minimizar" : "Expandir"}>
                    {expanded ? <Minimize className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
                  </Button>
                  <Button variant="outline" onClick={() => setShowChat((c) => !c)} title={showChat ? "Ocultar chat" : "Mostrar chat"}>
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                  {!recording ? (
                    <Button variant="outline" onClick={startRecording} title="Iniciar gravação">
                      <Video className="w-4 h-4 mr-2" /> Gravar
                    </Button>
                  ) : (
                    <Button variant="destructive" onClick={stopRecording} title="Encerrar gravação">
                      <Video className="w-4 h-4 mr-2" /> Encerrar gravação
                    </Button>
                  )}
                </>
              )}
            </div>
            {error && <div className="mt-2 text-sm text-destructive">{error}</div>}
            {!joined && (
              <div className="mt-3 text-xs text-muted-foreground">
                Dica: use um nome de sala compartilhado para reunir todos. Sinalização usa Supabase quando configurado; caso contrário, a chamada será apenas local.
              </div>
            )}
          </Card>

          {joined && (
          <div className={`grid ${showChat ? "grid-cols-1 xl:grid-cols-[1fr_340px]" : "grid-cols-1"} gap-4 flex-1 min-h-0`}>
            <Card className="p-3 flex flex-col">
              {/* Grade de vídeos */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {/* Local */}
                <div className="relative rounded-lg overflow-hidden border">
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover bg-black" />
                  <div className="absolute top-2 left-2 bg-background/70 px-2 py-1 rounded text-xs">Você {handRaised && "✋"}</div>
                </div>
                {/* Remotos */}
                {remotePeers.map((p) => (
                  <div key={p.id} className="relative rounded-lg overflow-hidden border">
                    <VideoTile stream={p.stream} name={p.name} handRaised={p.handRaised} />
                  </div>
                ))}
              </div>
              {/* Controles */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button variant={muted ? "secondary" : "default"} onClick={toggleMute} title={muted ? "Ativar áudio" : "Silenciar"}>
                  {muted ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />} {muted ? "Silenciado" : "Microfone"}
                </Button>
                <Button variant={cameraOn ? "default" : "secondary"} onClick={toggleCamera} title={cameraOn ? "Desligar câmera" : "Ligar câmera"}>
                  {cameraOn ? <Camera className="w-4 h-4 mr-2" /> : <CameraOff className="w-4 h-4 mr-2" />} {cameraOn ? "Câmera ligada" : "Câmera desligada"}
                </Button>
                <Button variant={screenSharing ? "default" : "outline"} onClick={toggleScreenShare} title="Compartilhar tela">
                  <ScreenShare className="w-4 h-4 mr-2" /> {screenSharing ? "Compartilhando" : "Compartilhar tela"}
                </Button>
                <Button variant={handRaised ? "default" : "outline"} onClick={toggleHand} title="Levantar a mão">
                  <Hand className="w-4 h-4 mr-2" /> {handRaised ? "Mão levantada" : "Levantar mão"}
                </Button>
              </div>
            </Card>

            {/* Chat lateral */}
            {showChat && (
              <Card className="p-3 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-sm">Chat da sala</div>
                  <Button variant="ghost" size="icon" onClick={() => setShowChat(false)} title="Ocultar"><X className="w-4 h-4" /></Button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {messages.map((m) => (
                    <div key={m.id} className={`text-sm ${m.senderId === session.id ? "text-right" : "text-left"}`}>
                      <div className="inline-block bg-muted px-2 py-1 rounded-md border border-border">
                        <span className="text-xs text-muted-foreground mr-2">{new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>
                <ChatInput onSend={(text) => sendMessage(session.id, session.name, text)} />
              </Card>
            )}
          </div>
          )}

          {/* Salas disponíveis */}
          <Card className="p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="text-xs text-muted-foreground">Salas disponíveis</div>
              <Button className="w-full sm:w-auto" size="sm" variant="outline" onClick={() => setCreating((c) => !c)}><Plus className="w-3 h-3 mr-1" /> Criar sala</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {rooms.map((r) => (
                <Button key={r.id} variant="outline" size="sm" onClick={() => tryJoinSelectedRoom(r.id, r.name)} title={r.password ? "Sala com senha" : "Sala aberta"}>
                  {r.name} {r.password ? <LockKeyhole className="w-3 h-3 ml-1" /> : null}
                </Button>
              ))}
              {rooms.length === 0 && (
                <div className="text-xs text-muted-foreground">Nenhuma sala criada ainda.</div>
              )}
              <div className="w-full h-px bg-border my-2" />
              <div className="text-xs text-muted-foreground mb-1">Sugestões</div>
              {sampleRooms.map((s) => (
                <Button key={s} variant="ghost" size="sm" onClick={() => setRoomName(s)}>{s}</Button>
              ))}
            </div>
          </Card>
        </div>

        {/* Direita: criação de sala e histórico */}
        <div className={`${expanded ? "order-last" : ""} flex flex-col gap-4 h-full min-h-0`}>
          <Card className="p-3">
            <div className="font-semibold mb-2">Criar sala</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input className="w-full" placeholder="Nome da sala" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} />
              <Input className="w-full" placeholder="Senha (opcional)" value={newRoomPassword} onChange={(e) => setNewRoomPassword(e.target.value)} />
              <div className="flex flex-col md:flex-row gap-2 min-w-0">
                <Button onClick={createRoom} className="w-full md:flex-1"><Plus className="w-4 h-4 mr-2" /> Salvar</Button>
                {creating && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => deleteRoomByName()}
                    className="w-full md:w-auto"
                    title="Excluir sala"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-3 flex-1 min-h-0">
            <div className="flex items-center gap-2 mb-2">
              <History className="w-4 h-4" />
              <div className="font-semibold">Histórico de reuniões encerradas</div>
            </div>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {history.length === 0 && (
                <div className="text-xs text-muted-foreground">Nenhuma reunião encerrada ainda.</div>
              )}
              {history.map((h, idx) => (
                <div key={idx} className="border rounded p-2 text-sm">
                  <div className="font-medium">{h.roomName || h.roomId}</div>
                  <div className="text-xs text-muted-foreground">Encerrada em {new Date(h.endedAt).toLocaleString("pt-BR")}</div>
                  {h.topic && <div className="text-xs">Tópico: {h.topic}</div>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function VideoTile({ stream, name, handRaised }: { stream: MediaStream | null; name: string; handRaised?: boolean }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => { if (ref.current && stream) ref.current.srcObject = stream; }, [stream]);
  return (
    <div className="w-full h-full">
      <video ref={ref} autoPlay playsInline className="w-full h-full object-cover bg-black" />
      <div className="absolute top-2 left-2 bg-background/70 px-2 py-1 rounded text-xs">
        {name} {handRaised && "✋"}
      </div>
    </div>
  );
}

function ChatInput({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); const t = text.trim(); if (!t) return; onSend(t); setText(""); }}
      className="mt-2 flex flex-wrap items-center gap-2"
    >
      <Input className="flex-1 min-w-[200px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="Digite uma mensagem" />
      <Button className="w-full sm:w-auto" type="submit"><MessageSquare className="w-4 h-4 mr-2" /> Enviar</Button>
    </form>
  );
}

function DocsList({ roomId }: { roomId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const key = `meetings_local_${roomId || "default"}`;
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (isSupabaseEnabled && supabase) {
        const basePath = roomId || "default";
        const [rootRes, recRes] = await Promise.all([
          supabase.storage.from("meetings").list(basePath, { limit: 100 }),
          supabase.storage.from("meetings").list(`${basePath}/recordings`, { limit: 100 }),
        ]);
        const rootErr = (rootRes as any).error;
        const recErr = (recRes as any).error;
        if (rootErr || recErr) {
          console.warn("List error:", rootErr?.message || recErr?.message);
          if (!mounted) return;
          const rootData = (rootRes as any).data || [];
          const recData = (recRes as any).data || [];
          setItems([...rootData, ...recData].map((d: any) => ({ name: d.name, type: d.metadata?.mimetype, size: d.metadata?.size })));
        } else {
          const rootData = (rootRes as any).data || [];
          const recData = (recRes as any).data || [];
          setItems([...rootData, ...recData].map((d: any) => ({ name: d.name, type: d.metadata?.mimetype, size: d.metadata?.size })));
        }
      } else {
        try {
          const arr = JSON.parse(localStorage.getItem(key) || "[]");
          setItems(arr);
        } catch { setItems([]); }
      }
    })();
    return () => { mounted = false; };
  }, [roomId]);
  return (
    <div className="space-y-2">
      {items.length === 0 && <div className="text-xs text-muted-foreground">Nenhum documento salvo.</div>}
      {items.map((i, idx) => (
        <div key={idx} className="flex items-center justify-between border rounded p-2">
          <div className="text-sm font-medium truncate">{i.name}</div>
          <div className="text-xs text-muted-foreground">{i.size ? `${Math.round(i.size/1024)} KB` : ""}</div>
        </div>
      ))}
    </div>
  );
}
