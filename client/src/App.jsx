import { useState } from 'react';
import Home from './pages/Home.jsx';
import Meeting from './pages/Meeting.jsx';

export default function App() {
  const [meeting, setMeeting] = useState(null);
  return meeting
    ? <Meeting roomId={meeting.roomId} name={meeting.name} onLeave={() => setMeeting(null)} />
    : <Home onJoin={(roomId, name) => setMeeting({ roomId, name })} />;
}
