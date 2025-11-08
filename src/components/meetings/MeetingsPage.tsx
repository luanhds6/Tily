import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Session } from "@/hooks/useAuth";
import { useMeetingRoom } from "@/hooks/useMeetingRoom";
import { useChat } from "@/hooks/useChat";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";
import { Video, Mic, MicOff, Camera, CameraOff, ScreenShare, Hand, MessageSquare, X, Upload, Folder, Expand, Minimize, PhoneOff, LockKeyhole, Plus } from "lucide-react";

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
    setTimeout(() => { joinRoom(); }, 100);
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
            <div className="flex items-center gap-2">
              <Input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Nome da sala" />
              {!joined ? (
                <Button onClick={joinRoom} title="Entrar na sala"><Video className="w-4 h-4 mr-2" /> Entrar</Button>
              ) : (
                <Button variant="destructive" onClick={leaveRoom} title="Encerrar reunião"><PhoneOff className="w-4 h-4 mr-2" /> Encerrar</Button>
              )}
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
            </div>
            {error && <div className="mt-2 text-sm text-destructive">{error}</div>}
            {!joined && (
              <div className="mt-3 text-xs text-muted-foreground">
                Dica: use um nome de sala compartilhado para reunir todos. Sinalização usa Supabase quando configurado; caso contrário, a chamada será apenas local.
              </div>
            )}
          </Card>

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

          {/* Salas disponíveis + criação */}
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground">Salas disponíveis</div>
              <Button size="sm" variant="outline" onClick={() => setCreating((c) => !c)}><Plus className="w-3 h-3 mr-1" /> Criar sala</Button>
            </div>
            {creating && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                <Input placeholder="Nome da sala" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} />
                <Input placeholder="Senha (opcional)" value={newRoomPassword} onChange={(e) => setNewRoomPassword(e.target.value)} />
                <Button onClick={createRoom}>Salvar</Button>
              </div>
            )}
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

        {/* Direita: Fichários / backups */}
        <div className={`${expanded ? "order-last" : ""} flex flex-col h-full min-h-0`}>
          <Card className="p-3 flex-1 min-h-0">
            <Tabs defaultValue="docs" className="h-full flex flex-col">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="docs"><Folder className="w-3 h-3 mr-1" /> Fichários</TabsTrigger>
                <TabsTrigger value="upload"><Upload className="w-3 h-3 mr-1" /> Upload</TabsTrigger>
              </TabsList>
              <TabsContent value="docs" className="flex-1 overflow-y-auto p-2">
                <DocsList roomId={roomId} />
              </TabsContent>
              <TabsContent value="upload" className="p-2">
                <div className="space-y-2">
                  <input id="meeting-upload" type="file" multiple onChange={(e) => handleUpload(e.target.files)} />
                  <div className="text-xs text-muted-foreground">Arquivos serão enviados para Supabase Storage (bucket 'meetings') quando configurado; caso contrário, serão salvos localmente.</div>
                  {uploadStatus && (
                    <pre className="text-xs whitespace-pre-wrap bg-muted/30 p-2 rounded border">{uploadStatus}</pre>
                  )}
                </div>
              </TabsContent>
            </Tabs>
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
      className="mt-2 flex items-center gap-2"
    >
      <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Digite uma mensagem" />
      <Button type="submit"><MessageSquare className="w-4 h-4 mr-2" /> Enviar</Button>
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