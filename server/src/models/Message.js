import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  sender: { type: String, required: true, maxlength: 40 },
  text: { type: String, required: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Message || mongoose.model('Message', messageSchema);
