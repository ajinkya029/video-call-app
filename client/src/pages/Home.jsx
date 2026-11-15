import { useState } from 'react';
import { Video, Users, ShieldCheck, ArrowRight } from 'lucide-react';

export default function Home({ onJoin }) {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');

  function createRoom() {
    const id = `meet-${Math.random().toString(36).slice(2, 8)}`;
    onJoin(id, name.trim() || 'Guest');
  }

  function joinRoom(event) {
    event.preventDefault();
    if (roomId.trim()) onJoin(roomId.trim(), name.trim() || 'Guest');
  }

  return (
    <main className="home-shell">
      <nav className="top-nav"><div className="brand"><span className="brand-mark"><Video size={19} /></span>Connect<span>Now</span></div><span className="nav-caption">Video meetings, made simple</span></nav>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse-dot" /> PRIVATE VIDEO ROOMS</div>
          <h1>Make every<br /><em>conversation</em> count.</h1>
          <p className="hero-description">Clear conversations start with a simple connection. Create a room and bring your people together.</p>
          <div className="feature-row">
            <div><Users size={18} /><span>Group conversations</span></div>
            <div><ShieldCheck size={18} /><span>Browser-based</span></div>
          </div>
        </div>
        <div className="join-card">
          <div className="card-icon"><Video size={23} /></div>
          <h2>Ready to connect?</h2>
          <p>Enter your name, then create a new room or join an existing one.</p>
          <label>Your name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex" maxLength={40} />
          <button className="primary-button" onClick={createRoom}>Create a new meeting <ArrowRight size={17} /></button>
          <div className="or-divider"><span>OR JOIN WITH A CODE</span></div>
          <form onSubmit={joinRoom}>
            <input value={roomId} onChange={e => setRoomId(e.target.value)} placeholder="Enter meeting room ID" maxLength={80} />
            <button className="secondary-button" disabled={!roomId.trim()}>Join meeting</button>
          </form>
          <div className="privacy-note"><ShieldCheck size={14} /> Your browser will ask for camera and mic access</div>
        </div>
      </section>
      <footer className="home-footer"><span>© 2026 ConnectNow</span><span>Built for meaningful conversations</span></footer>
    </main>
  );
}
