import { Router } from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message.js';

const router = Router();

router.get('/:roomId', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.json({ messages: [], persisted: false });
  }
  try {
    const roomId = String(req.params.roomId).slice(0, 80);
    const messages = await Message.find({ roomId }).sort({ createdAt: 1 }).limit(100).lean();
    res.json({ messages, persisted: true });
  } catch {
    res.status(500).json({ message: 'Could not load messages' });
  }
});

export default router;
