import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';

export default function ChatPanel({ messages, onSend, name }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function submit(event) {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setText('');
  }

  return (
    <aside className="chat-panel">
      <div className="chat-heading">
        <div><h2>Meeting chat</h2><p>Messages are shared with everyone</p></div>
      </div>
      <div className="message-list">
        {messages.length === 0 && <div className="empty-chat">No messages yet. Say hello 👋</div>}
        {messages.map((message, index) => (
          <div className={`message ${message.sender === name ? 'own-message' : ''}`} key={message._id || index}>
            <strong>{message.sender}</strong>
            <p>{message.text}</p>
            <time>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="chat-form" onSubmit={submit}>
        <input value={text} onChange={event => setText(event.target.value)} placeholder="Type a message..." maxLength={1000} />
        <button aria-label="Send message" type="submit" disabled={!text.trim()}><Send size={18} /></button>
      </form>
    </aside>
  );
}
