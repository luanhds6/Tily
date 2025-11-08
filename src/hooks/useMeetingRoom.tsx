import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, isSupabaseEnabled } from "@/lib/supabase";

type RemoteParticipant = {
  id: string;
  name: string;
  stream: MediaStream | null;
  handRaised?: boolean;
};

type SignalMessage =
  | { type: "offer"; from: string; to: string; sdp: any }
  | { type: "answer"; from: string; to: string; sdp: any }
  | { type: "candidate"; from: string; to: string; candidate: any }
  | { type: "hand"; from: string; to?: string; raised: boolean };

export function useMeetingRoom(params: { userId: string; userName: string; roomId: string }) {
  const { userId, userName, roomId } = params;
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remotePeers, setRemotePeers] = useState<RemoteParticipant[]>([]);

  const localStreamRef = useRef<MediaStream | null>(null);
  const pcMapRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<any>(null);
  const localVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const localAudioTrackRef = useRef<MediaStreamTrack | null>(null);

  const rtcConfig: RTCConfiguration = useMemo(() => ({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  }), []);

  const presencePeers = useRef<Set<string>>(new Set());

  const ensurePeer = useCallback((peerId: string) => {
    if (pcMapRef.current.has(peerId)) return pcMapRef.current.get(peerId)!;
    const pc = new RTCPeerConnection(rtcConfig);
    pcMapRef.current.set(peerId, pc);
    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
    }
    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      sendSignal({ type: "candidate", from: userId, to: peerId, candidate: ev.candidate });
    };
    pc.ontrack = (ev) => {
      const [stream] = ev.streams;
      setRemotePeers((prev) => {
        const exists = prev.find((p) => p.id === peerId);
        if (exists) return prev.map((p) => (p.id === peerId ? { ...p, stream } : p));
        return [...prev, { id: peerId, name: peerId, stream }];
      });
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "closed" || s === "failed" || s === "disconnected") {
        setRemotePeers((prev) => prev.filter((p) => p.id !== peerId));
        pcMapRef.current.delete(peerId);
      }
    };
    return pc;
  }, [rtcConfig, userId]);

  const sendSignal = useCallback((msg: SignalMessage) => {
    if (!isSupabaseEnabled || !supabase) return;
    channelRef.current?.send?.({ type: "broadcast", event: "signal", payload: msg });
  }, []);

  const createOfferTo = useCallback(async (peerId: string) => {
    const pc = ensurePeer(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSignal({ type: "offer", from: userId, to: peerId, sdp: offer });
  }, [ensurePeer, sendSignal, userId]);

  const handleSignal = useCallback(async (msg: SignalMessage) => {
    if ((msg as any).from === userId) return; // ignore own
    if ((msg as any).to && (msg as any).to !== userId) return; // not for me
    if (msg.type === "hand") {
      setRemotePeers((prev) => prev.map((p) => (p.id === (msg as any).from ? { ...p, handRaised: msg.raised } : p)));
      return;
    }
    if (msg.type === "offer") {
      const pc = ensurePeer(msg.from);
      await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal({ type: "answer", from: userId, to: msg.from, sdp: answer });
    } else if (msg.type === "answer") {
      const pc = ensurePeer(msg.from);
      await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
    } else if (msg.type === "candidate") {
      const pc = ensurePeer(msg.from);
      try {
        await pc.addIceCandidate(msg.candidate);
      } catch (e) {
        console.warn("ICE add error", e);
      }
    }
  }, [ensurePeer, sendSignal, userId]);

  const joinRoom = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStreamRef.current = stream;
      localAudioTrackRef.current = stream.getAudioTracks()[0] || null;
      localVideoTrackRef.current = stream.getVideoTracks()[0] || null;
      setJoined(true);
    } catch (e: any) {
      setError("Não foi possível acessar câmera/microfone: " + (e?.message || e));
      return;
    }

    if (!isSupabaseEnabled || !supabase) {
      // Sem sinalização, apenas local
      return;
    }

    const channel = supabase.channel(`meeting:${roomId}`, { config: { presence: { key: userId } } });
    channelRef.current = channel;
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState() as Record<string, Array<{ userId: string; name: string }>>;
      const peers = Object.keys(state).filter((pid) => pid !== userId);
      presencePeers.current = new Set(peers);
      // determinista: quem tem id maior inicia offer
      peers.forEach((pid) => {
        ensurePeer(pid);
        setRemotePeers((prev) => {
          const exists = prev.find((p) => p.id === pid);
          const peerName = state[pid]?.[0]?.name || pid;
          if (exists) return prev.map((p) => (p.id === pid ? { ...p, name: peerName } : p));
          return [...prev, { id: pid, name: peerName, stream: null }];
        });
        if (userId > pid) {
          createOfferTo(pid);
        }
      });
    });
    channel.on("broadcast", { event: "signal" }, (payload: any) => {
      const msg = payload.payload as SignalMessage;
      handleSignal(msg);
    });
    const sub = await channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        channel.track({ userId, name: userName });
      }
    });
    if (sub !== "SUBSCRIBED") {
      setError("Falha ao entrar no canal de reunião");
    }
  }, [roomId, userId, userName, createOfferTo, handleSignal, ensurePeer]);

  const leaveRoom = useCallback(async () => {
    setJoined(false);
    setScreenSharing(false);
    setHandRaised(false);
    try {
      pcMapRef.current.forEach((pc) => pc.close());
      pcMapRef.current.clear();
      setRemotePeers([]);
      channelRef.current && supabase && supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    } catch {}
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
  }, []);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    if (localAudioTrackRef.current) localAudioTrackRef.current.enabled = !next;
  }, [muted]);

  const toggleCamera = useCallback(() => {
    const next = !cameraOn;
    setCameraOn(next);
    if (localVideoTrackRef.current) localVideoTrackRef.current.enabled = next;
  }, [cameraOn]);

  const toggleHand = useCallback(() => {
    const next = !handRaised;
    setHandRaised(next);
    if (isSupabaseEnabled && supabase) {
      sendSignal({ type: "hand", from: userId, raised: next });
    }
  }, [handRaised, sendSignal, userId]);

  const toggleScreenShare = useCallback(async () => {
    if (!joined) return;
    if (!screenSharing) {
      try {
        const display = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: false });
        const screenTrack: MediaStreamTrack | null = display.getVideoTracks()[0] || null;
        if (screenTrack && localStreamRef.current) {
          // Replace track
          const senders: RTCRtpSender[] = [];
          pcMapRef.current.forEach((pc) => {
            pc.getSenders().forEach((s) => senders.push(s));
          });
          const videoSender = senders.find((s) => s.track && s.track.kind === "video");
          if (videoSender) videoSender.replaceTrack(screenTrack);
          localStreamRef.current.removeTrack(localVideoTrackRef.current!);
          localStreamRef.current.addTrack(screenTrack);
          localVideoTrackRef.current = screenTrack;
          setScreenSharing(true);
          screenTrack.onended = () => {
            // restore camera
            if (localStreamRef.current && localVideoTrackRef.current) {
              // nothing to do here, will be restored on toggle off
            }
            setScreenSharing(false);
          };
        }
      } catch (e: any) {
        setError("Não foi possível compartilhar a tela: " + (e?.message || e));
      }
    } else {
      // restore original camera
      try {
        const camera = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const camTrack = camera.getVideoTracks()[0];
        if (camTrack && localStreamRef.current) {
          const senders: RTCRtpSender[] = [];
          pcMapRef.current.forEach((pc) => pc.getSenders().forEach((s) => senders.push(s)));
          const videoSender = senders.find((s) => s.track && s.track.kind === "video");
          if (videoSender) videoSender.replaceTrack(camTrack);
          localStreamRef.current.getVideoTracks().forEach((t) => t.stop());
          localStreamRef.current.removeTrack(localVideoTrackRef.current!);
          localStreamRef.current.addTrack(camTrack);
          localVideoTrackRef.current = camTrack;
          setScreenSharing(false);
        }
      } catch (e: any) {
        setError("Falha ao restaurar câmera: " + (e?.message || e));
      }
    }
  }, [joined, screenSharing]);

  useEffect(() => {
    return () => {
      // cleanup on unmount
      pcMapRef.current.forEach((pc) => pc.close());
      pcMapRef.current.clear();
      if (channelRef.current && supabase) {
        try { supabase.removeChannel(channelRef.current); } catch {}
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
  }, []);

  return {
    joined,
    error,
    localStream: localStreamRef.current,
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
  };
}