import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { iceServers } from '../config/iceServers.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function useCall({ roomId, name }) {
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map());
  const pendingCandidates = useRef(new Map());
  const [localStream, setLocalStream] = useState(null);
  const [remotePeers, setRemotePeers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [sharing, setSharing] = useState(false);

  const updatePeer = useCallback((id, patch) => {
    setRemotePeers(current => {
      const found = current.some(peer => peer.socketId === id);
      return found
        ? current.map(peer => peer.socketId === id ? { ...peer, ...patch } : peer)
        : [...current, { socketId: id, name: 'Guest', stream: null, ...patch }];
    });
  }, []);

  const removePeer = useCallback((id) => {
    const pc = peersRef.current.get(id);
    if (pc) pc.close();
    peersRef.current.delete(id);
    pendingCandidates.current.delete(id);
    setRemotePeers(current => current.filter(peer => peer.socketId !== id));
  }, []);

  const createPeer = useCallback((peerId, peerName, initiator) => {
    if (peersRef.current.has(peerId)) return peersRef.current.get(peerId);

    const pc = new RTCPeerConnection({ iceServers });
    peersRef.current.set(peerId, pc);

    const stream = localStreamRef.current;
    stream?.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.onicecandidate = event => {
      if (event.candidate) socketRef.current?.emit('webrtc:ice-candidate', {
        to: peerId, candidate: event.candidate
      });
    };

    pc.ontrack = event => {
      const incoming = event.streams[0];
      if (incoming) updatePeer(peerId, { stream: incoming, name: peerName || 'Guest' });
    };

    pc.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(pc.connectionState)) removePeer(peerId);
    };

    updatePeer(peerId, { name: peerName || 'Guest' });

    if (initiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer).then(() => offer))
        .then(offer => socketRef.current?.emit('webrtc:offer', { to: peerId, offer }))
        .catch(err => setError(`Could not start peer connection: ${err.message}`));
    }
    return pc;
  }, [removePeer, updatePeer]);

  useEffect(() => {
    let active = true;
    let socket;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);

        socket = io(API_URL, { transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        socket.on('connect', () => {
          setConnected(true);
          socket.emit('room:join', { roomId, name });
        });
        socket.on('disconnect', () => setConnected(false));
        socket.on('connect_error', err => setError(`Server connection failed: ${err.message}`));
        socket.on('room:error', message => setError(message));

        socket.on('room:peers', peers => {
          peers.forEach(peer => createPeer(peer.socketId, peer.name, true));
        });
        socket.on('peer:joined', peer => {
          updatePeer(peer.socketId, { name: peer.name });
        });
        socket.on('peer:left', ({ socketId }) => removePeer(socketId));

        socket.on('webrtc:offer', async ({ from, name: peerName, offer }) => {
          const pc = createPeer(from, peerName, false);
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtc:answer', { to: from, answer });
            const queued = pendingCandidates.current.get(from) || [];
            for (const candidate of queued) await pc.addIceCandidate(new RTCIceCandidate(candidate));
            pendingCandidates.current.delete(from);
          } catch (err) {
            setError(`Could not answer call: ${err.message}`);
          }
        });

        socket.on('webrtc:answer', async ({ from, answer }) => {
          const pc = peersRef.current.get(from);
          if (!pc) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            const queued = pendingCandidates.current.get(from) || [];
            for (const candidate of queued) await pc.addIceCandidate(new RTCIceCandidate(candidate));
            pendingCandidates.current.delete(from);
          } catch (err) {
            setError(`Could not complete call: ${err.message}`);
          }
        });

        socket.on('webrtc:ice-candidate', async ({ from, candidate }) => {
          const pc = peersRef.current.get(from);
          if (pc?.remoteDescription) {
            try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
            catch (err) { console.warn('ICE candidate rejected', err); }
          } else {
            const queue = pendingCandidates.current.get(from) || [];
            queue.push(candidate);
            pendingCandidates.current.set(from, queue);
          }
        });

        socket.on('chat:new', message => setMessages(current => [...current, message]));
        try {
          const response = await fetch(`${API_URL}/api/chat/${encodeURIComponent(roomId)}`);
          const data = await response.json();
          if (active && data.messages?.length) setMessages(data.messages);
        } catch {
          // Chat remains available over Socket.IO if history cannot be fetched.
        }
      } catch (err) {
        setError(err.name === 'NotAllowedError'
          ? 'Camera or microphone permission was denied. Allow access and reload.'
          : `Could not access camera/microphone: ${err.message}`);
      }
    }

    start();
    return () => {
      active = false;
      socket?.disconnect();
      peersRef.current.forEach(pc => pc.close());
      peersRef.current.clear();
      localStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [roomId, name, createPeer, removePeer, updatePeer]);

  const toggleMic = useCallback(() => {
    const next = !micOn;
    localStreamRef.current?.getAudioTracks().forEach(track => { track.enabled = next; });
    setMicOn(next);
  }, [micOn]);

  const toggleCamera = useCallback(() => {
    const next = !cameraOn;
    localStreamRef.current?.getVideoTracks().forEach(track => { track.enabled = next; });
    setCameraOn(next);
  }, [cameraOn]);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (!sharing) {
        const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = display.getVideoTracks()[0];
        peersRef.current.forEach(pc => {
          const sender = pc.getSenders().find(item => item.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });
        screenTrack.onended = () => restoreCamera();
        setSharing(true);
      } else {
        await restoreCamera();
      }
    } catch (err) {
      if (err.name !== 'NotAllowedError') setError(`Screen sharing failed: ${err.message}`);
    }
  }, [sharing]);

  const restoreCamera = useCallback(async () => {
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
    if (cameraTrack) {
      peersRef.current.forEach(pc => {
        const sender = pc.getSenders().find(item => item.track?.kind === 'video');
        if (sender) sender.replaceTrack(cameraTrack);
      });
    }
    setSharing(false);
  }, []);

  const sendMessage = useCallback((text) => {
    socketRef.current?.emit('chat:send', { text });
  }, []);

  const leaveCall = useCallback(() => {
    socketRef.current?.disconnect();
    peersRef.current.forEach(pc => pc.close());
    peersRef.current.clear();
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    setLocalStream(null);
  }, []);

  return {
    localStream, remotePeers, messages, connected, error,
    micOn, cameraOn, sharing, toggleMic, toggleCamera,
    toggleScreenShare, sendMessage, leaveCall
  };
}
