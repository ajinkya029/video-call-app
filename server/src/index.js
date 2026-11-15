import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import chatRoutes from './routes/chatRoutes.js';
import { registerCallHandlers } from './socket/callHandlers.js';

const app = express();
const server = http.createServer(app);
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({ origin: allowedOrigin, methods: ['GET', 'POST'] }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ConnectNow API' });
});
app.use('/api/chat', chatRoutes);

const io = new Server(server, {
  cors: { origin: allowedOrigin, methods: ['GET', 'POST'] }
});

io.on('connection', (socket) => {
  registerCallHandlers(io, socket);
});

const port = process.env.PORT || 5000;

async function start() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('MongoDB connected');
    } catch (error) {
      console.error('MongoDB connection failed; chat persistence is unavailable:', error.message);
    }
  } else {
    console.log('MONGODB_URI not set; running without chat persistence');
  }

  server.listen(port, () => console.log(`ConnectNow API listening on port ${port}`));
}

start();
