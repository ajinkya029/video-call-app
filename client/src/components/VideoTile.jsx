import { useEffect, useRef } from 'react';
import { MicOff, UserRound } from 'lucide-react';

export default function VideoTile({ stream, name, muted = false, local = false, micOn = true }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className={`video-tile ${local ? 'local-tile' : ''}`}>
      {stream ? (
        <video ref={videoRef} autoPlay playsInline muted={muted} />
      ) : (
        <div className="avatar-placeholder"><UserRound size={42} /></div>
      )}
      <div className="tile-label">
        <span>{name}{local ? ' (You)' : ''}</span>
        {(!micOn || !local) && <MicOff size={14} />}
      </div>
    </div>
  );
}
