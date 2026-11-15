import { useEffect, useState } from 'react';
import { useCall } from '../hooks/useCall.js';
import VideoTile from '../components/VideoTile.jsx';
import ChatPanel from '../components/ChatPanel.jsx';
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, MessageSquare,
  Copy, Check, Users, Wifi, WifiOff
} from 'lucide-react';

export default function Meeting({ roomId, name, onLeave }) {
  const call = useCall({ roomId, name });
  const [chatOpen, setChatOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (call.error) console.warn(call.error);
  }, [call.error]);

  async function copyRoom() {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy this room ID:', roomId);
    }
  }

  function leave() {
    call.leaveCall();
    onLeave();
  }

  const participantCount = call.remotePeers.length + 1;

  return (
    <main className="meeting-shell">
      <header className="meeting-header">
        <div className="brand"><span className="brand-mark"><Video size={18} /></span>Connect<span>Now</span></div>
        <div className="meeting-meta">
          <span className={`connection-pill ${call.connected ? 'online' : ''}`}>{call.connected ? <Wifi size={14} /> : <WifiOff size={14} />}{call.connected ? 'Connected' : 'Connecting'}</span>
          <button className="room-code" onClick={copyRoom}>{copied ? <Check size={14} /> : <Copy size={14} />}{roomId}</button>
        </div>
      </header>

      {call.error && <div className="error-banner">{call.error}</div>}

      <div className={`meeting-content ${chatOpen ? 'with-chat' : ''}`}>
        <section className="stage">
          <div className="stage-topline">
            <div><h1>Team meeting</h1><p>Welcome, {name}</p></div>
            <div className="participant-count"><Users size={16} /> {participantCount} {participantCount === 1 ? 'participant' : 'participants'}</div>
          </div>
          <div className={`video-grid ${call.remotePeers.length > 1 ? 'many-videos' : ''}`}>
            <VideoTile stream={call.localStream} name={name} local muted micOn={call.micOn} />
            {call.remotePeers.map(peer => (
              <VideoTile key={peer.socketId} stream={peer.stream} name={peer.name} />
            ))}
          </div>
          {call.remotePeers.length === 0 && <div className="waiting-hint">Your meeting is ready. Share the room ID to invite others.</div>}
          <div className="controls-bar">
            <button className={`control-button ${!call.micOn ? 'control-off' : ''}`} onClick={call.toggleMic} title={call.micOn ? 'Mute microphone' : 'Unmute microphone'}>
              {call.micOn ? <Mic /> : <MicOff />}<span>{call.micOn ? 'Mute' : 'Unmute'}</span>
            </button>
            <button className={`control-button ${!call.cameraOn ? 'control-off' : ''}`} onClick={call.toggleCamera} title={call.cameraOn ? 'Turn camera off' : 'Turn camera on'}>
              {call.cameraOn ? <Video /> : <VideoOff />}<span>{call.cameraOn ? 'Camera' : 'Start video'}</span>
            </button>
            <button className={`control-button ${call.sharing ? 'control-active' : ''}`} onClick={call.toggleScreenShare} title="Share screen">
              <MonitorUp /><span>{call.sharing ? 'Stop share' : 'Share screen'}</span>
            </button>
            <button className={`control-button ${chatOpen ? 'control-active' : ''}`} onClick={() => setChatOpen(v => !v)} title="Toggle chat">
              <MessageSquare /><span>Chat</span>
            </button>
            <button className="leave-button" onClick={leave}><PhoneOff /><span>Leave</span></button>
          </div>
        </section>
        {chatOpen && <ChatPanel messages={call.messages} onSend={call.sendMessage} name={name} />}
      </div>
    </main>
  );
}
