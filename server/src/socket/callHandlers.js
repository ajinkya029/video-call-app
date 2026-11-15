import mongoose from 'mongoose';
import Message from '../models/Message.js';

const roomMembers = new Map();

export function registerCallHandlers(io, socket) {
  socket.on('room:join', ({ roomId, name }) => {
    if (typeof roomId !== 'string' || !/^[a-zA-Z0-9_-]{3,80}$/.test(roomId)) {
      socket.emit('room:error', 'Room ID must be 3–80 characters (letters, numbers, _ or -).');
      return;
    }

    const cleanName = String(name || 'Guest').trim().slice(0, 40) || 'Guest';
    const members = roomMembers.get(roomId) || new Map();
    const existingPeers = [...members.entries()].map(([id, peer]) => ({
      socketId: id, name: peer.name
    }));

    socket.join(roomId);
    members.set(socket.id, { name: cleanName });
    roomMembers.set(roomId, members);
    socket.data.roomId = roomId;
    socket.data.name = cleanName;

    socket.emit('room:peers', existingPeers);
    socket.to(roomId).emit('peer:joined', { socketId: socket.id, name: cleanName });
  });

  socket.on('webrtc:offer', ({ to, offer }) => {
    if (to && offer) io.to(to).emit('webrtc:offer', {
      from: socket.id, name: socket.data.name, offer
    });
  });

  socket.on('webrtc:answer', ({ to, answer }) => {
    if (to && answer) io.to(to).emit('webrtc:answer', { from: socket.id, answer });
  });

  socket.on('webrtc:ice-candidate', ({ to, candidate }) => {
    if (to && candidate) io.to(to).emit('webrtc:ice-candidate', {
      from: socket.id, candidate
    });
  });

  socket.on('chat:send', async ({ text }) => {
    const roomId = socket.data.roomId;
    const cleanText = String(text || '').trim().slice(0, 1000);
    if (!roomId || !cleanText) return;

    const message = {
      _id: `${Date.now()}-${socket.id}`,
      roomId,
      sender: socket.data.name || 'Guest',
      text: cleanText,
      createdAt: new Date()
    };

    if (mongoose.connection.readyState === 1) {
      try {
        const saved = await Message.create({
          roomId, sender: message.sender, text: cleanText
        });
        message._id = saved._id.toString();
        message.createdAt = saved.createdAt;
      } catch (error) {
        console.error('Chat persistence error:', error.message);
      }
    }
    io.to(roomId).emit('chat:new', message);
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const members = roomMembers.get(roomId);
    if (members) {
      members.delete(socket.id);
      if (members.size === 0) roomMembers.delete(roomId);
      else io.to(roomId).emit('peer:left', { socketId: socket.id });
    }
  });
}
