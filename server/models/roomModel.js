const Room = require('./roomSchema');

// In-memory Room Model with persistent sync to MongoDB Atlas
class RoomModel {
  constructor() {
    this.rooms = new Map();
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  createRoom(roomId, hostSocketId) {
    const room = {
      id: roomId,
      hostId: hostSocketId,
      participants: new Map(),
      videoId: null,
      playState: 'paused',
      currentTime: 0,
      lastUpdated: Date.now()
    };
    this.rooms.set(roomId, room);
    this.persistRoom(room).catch(err => console.error("Error persisting room:", err.message));
    return room;
  }

  addParticipant(roomId, socketId, username, role) {
    let room = this.getRoom(roomId);
    if (!room) {
      room = this.createRoom(roomId, socketId);
      role = 'host';
    }
    const participant = { userId: socketId, username, role };
    room.participants.set(socketId, participant);
    this.persistRoom(room).catch(err => console.error("Error persisting room:", err.message));
    return { room, participant };
  }

  removeParticipant(roomId, socketId) {
    const room = this.getRoom(roomId);
    if (!room) return null;

    const leaver = room.participants.get(socketId);
    room.participants.delete(socketId);

    let newHost = null;
    if (room.participants.size === 0) {
      this.rooms.delete(roomId);
      Room.deleteOne({ roomId }).catch(err => console.error("Error deleting room in DB:", err.message));
      return { roomEmpty: true, roomId, leaver };
    }

    if (room.hostId === socketId) {
      const nextHostId = room.participants.keys().next().value;
      room.hostId = nextHostId;
      newHost = room.participants.get(nextHostId);
      if (newHost) {
        newHost.role = 'host';
      }
    }

    this.persistRoom(room).catch(err => console.error("Error persisting room:", err.message));

    return {
      roomEmpty: false,
      room,
      leaver,
      newHost,
      participantsList: [...room.participants.values()]
    };
  }

  updatePlayState(roomId, playState, currentTime) {
    const room = this.getRoom(roomId);
    if (!room) return null;
    room.playState = playState;
    if (Number.isFinite(currentTime) && currentTime >= 0) {
      room.currentTime = currentTime;
    }
    room.lastUpdated = Date.now();
    this.persistRoom(room).catch(err => console.error("Error persisting room:", err.message));
    return room;
  }

  updateSeek(roomId, currentTime) {
    const room = this.getRoom(roomId);
    if (!room) return null;
    if (Number.isFinite(currentTime) && currentTime >= 0) {
      room.currentTime = currentTime;
    }
    room.lastUpdated = Date.now();
    this.persistRoom(room).catch(err => console.error("Error persisting room:", err.message));
    return room;
  }

  updateVideo(roomId, videoId) {
    const room = this.getRoom(roomId);
    if (!room) return null;
    room.videoId = videoId;
    room.playState = 'paused';
    room.currentTime = 0;
    room.lastUpdated = Date.now();
    this.persistRoom(room).catch(err => console.error("Error persisting room:", err.message));
    return room;
  }

  assignRole(roomId, targetUserId, newRole) {
    const room = this.getRoom(roomId);
    if (!room) return null;

    const targetParticipant = room.participants.get(targetUserId);
    if (!targetParticipant) return null;

    targetParticipant.role = newRole;
    this.persistRoom(room).catch(err => console.error("Error persisting room:", err.message));

    return {
      targetParticipant,
      participantsList: [...room.participants.values()]
    };
  }

  transferHost(roomId, newHostId) {
    const room = this.getRoom(roomId);
    if (!room) return null;

    const oldHostId = room.hostId;
    const oldHost = room.participants.get(oldHostId);
    const newHost = room.participants.get(newHostId);
    if (!newHost) return null;

    if (oldHost) {
      oldHost.role = 'moderator';
    }
    newHost.role = 'host';
    room.hostId = newHostId;

    this.persistRoom(room).catch(err => console.error("Error persisting room:", err.message));

    return {
      oldHost,
      newHost,
      participantsList: [...room.participants.values()]
    };
  }

  getCurrentTime(room) {
    if (!room) return 0;
    if (room.playState !== 'playing') return room.currentTime;
    return room.currentTime + (Date.now() - room.lastUpdated) / 1000;
  }

  hasPermission(role, action) {
    const ROLE_PERMISSIONS = {
      play: ['host', 'moderator'],
      pause: ['host', 'moderator'],
      seek: ['host', 'moderator'],
      change_video: ['host', 'moderator'],
      assign_role: ['host'],
      remove_participant: ['host'],
      transfer_host: ['host']
    };
    return ROLE_PERMISSIONS[action]?.includes(role);
  }

  async persistRoom(room) {
    if (!room) return;
    try {
      const participantsArray = [...room.participants.values()].map(p => ({
        userId: p.userId,
        username: p.username,
        role: p.role
      }));

      await Room.findOneAndUpdate(
        { roomId: room.id },
        {
          roomId: room.id,
          hostId: room.hostId,
          videoId: room.videoId,
          playState: room.playState,
          currentTime: this.getCurrentTime(room),
          participants: participantsArray,
          lastActive: new Date()
        },
        { upsert: true, new: true }
      );
    } catch (e) {
      // Don't crash in-memory state if DB call has transient errors
      // console.error("MongoDB Room persist error:", e.message);
    }
  }
}

module.exports = new RoomModel();
