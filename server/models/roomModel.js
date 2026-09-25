// In-memory Room Model / Data Store
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

    return {
      roomEmpty: false,
      room,
      leaver,
      newHost,
      participantsList: [...room.participants.values()]
    };
  }

  updatePlayState(roomId, playState) {
    const room = this.getRoom(roomId);
    if (!room) return null;
    room.playState = playState;
    room.lastUpdated = Date.now();
    return room;
  }

  updateVideo(roomId, videoId) {
    const room = this.getRoom(roomId);
    if (!room) return null;
    room.videoId = videoId;
    room.playState = 'paused';
    room.currentTime = 0;
    room.lastUpdated = Date.now();
    return room;
  }

  hasPermission(role, action) {
    const ROLE_PERMISSIONS = {
      play: ['host', 'moderator'],
      pause: ['host', 'moderator'],
      change_video: ['host', 'moderator']
    };
    return ROLE_PERMISSIONS[action]?.includes(role);
  }
}

module.exports = new RoomModel();
