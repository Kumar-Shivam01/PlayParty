const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  role: {
    type: String,
    enum: ['host', 'moderator', 'participant', 'viewer'],
    default: 'participant'
  },
  joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  hostId: { type: String, required: true },
  videoId: { type: String, default: null },
  playState: { type: String, enum: ['playing', 'paused'], default: 'paused' },
  currentTime: { type: Number, default: 0 },
  participants: [participantSchema],
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Room', roomSchema);
