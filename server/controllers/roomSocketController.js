const roomModel = require('../models/roomModel');

function registerSocketHandlers(io, socket) {
  // 1. Join Room
  socket.on('join_room', ({ roomId, username }) => {
    if (!roomId || !username) {
      return socket.emit('error', 'roomId and username are required!');
    }

    const existingRoom = roomModel.getRoom(roomId);
    const role = existingRoom ? 'participant' : 'host';

    const { room, participant } = roomModel.addParticipant(roomId, socket.id, username, role);

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.username = username;
    socket.data.role = role;

    const participantsList = [...room.participants.values()];

    const joinPayload = {
      roomId,
      role,
      participants: participantsList,
      videoId: room.videoId,
      playState: room.playState,
      currentTime: roomModel.getCurrentTime(room)
    };
    socket.emit('joined_room', joinPayload);
    socket.emit('room_joined', joinPayload);

    // Notify other participants in the room
    socket.to(roomId).emit('user_joined', {
      username,
      userId: socket.id,
      role,
      participants: participantsList
    });

    console.log(`👤 ${username} (${role}) joined room ${roomId}`);
  });

  // 2. Play
  socket.on('play', ({ currentTime } = {}) => {
    const roomId = socket.data.roomId;
    const room = roomModel.getRoom(roomId);
    const participant = room?.participants.get(socket.id);
    if (!participant || !roomModel.hasPermission(participant.role, 'play')) {
      return socket.emit('error', 'Not permitted: Playback control is restricted to Host and Moderator');
    }

    roomModel.updatePlayState(roomId, 'playing', currentTime);
    io.to(roomId).emit('sync_state', {
      playState: room.playState,
      currentTime: roomModel.getCurrentTime(room),
      videoId: room.videoId
    });
  });

  // 3. Pause
  socket.on('pause', ({ currentTime } = {}) => {
    const roomId = socket.data.roomId;
    const room = roomModel.getRoom(roomId);
    const participant = room?.participants.get(socket.id);
    if (!participant || !roomModel.hasPermission(participant.role, 'pause')) {
      return socket.emit('error', 'Not permitted: Playback control is restricted to Host and Moderator');
    }

    roomModel.updatePlayState(roomId, 'paused', currentTime);
    io.to(roomId).emit('sync_state', {
      playState: room.playState,
      currentTime: roomModel.getCurrentTime(room),
      videoId: room.videoId
    });
  });

  // 4. Seek
  socket.on('seek', ({ time } = {}) => {
    const roomId = socket.data.roomId;
    const room = roomModel.getRoom(roomId);
    const participant = room?.participants.get(socket.id);
    if (!participant || !roomModel.hasPermission(participant.role, 'seek')) {
      return socket.emit('error', 'Not permitted: Seek control is restricted to Host and Moderator');
    }

    const seekTime = Number(time);
    if (isNaN(seekTime) || seekTime < 0) {
      return socket.emit('error', 'Invalid seek time');
    }

    roomModel.updateSeek(roomId, seekTime);
    io.to(roomId).emit('sync_state', {
      playState: room.playState,
      currentTime: seekTime,
      videoId: room.videoId
    });
  });

  // 5. Change Video
  socket.on('change_video', ({ videoId } = {}) => {
    const roomId = socket.data.roomId;
    const room = roomModel.getRoom(roomId);
    const participant = room?.participants.get(socket.id);
    if (!participant || !roomModel.hasPermission(participant.role, 'change_video')) {
      return socket.emit('error', 'Not permitted: Changing video is restricted to Host and Moderator');
    }

    if (typeof videoId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      return socket.emit('error', 'A valid YouTube video ID is required');
    }

    roomModel.updateVideo(roomId, videoId);
    io.to(roomId).emit('sync_state', {
      playState: room.playState,
      currentTime: 0,
      videoId: room.videoId
    });
  });

  // 6. Assign Role (Host only)
  socket.on('assign_role', ({ userId, role } = {}) => {
    const roomId = socket.data.roomId;
    const room = roomModel.getRoom(roomId);
    const participant = room?.participants.get(socket.id);

    if (!participant || !roomModel.hasPermission(participant.role, 'assign_role')) {
      return socket.emit('error', 'Not permitted: Only the Host can assign roles');
    }

    const allowedRoles = ['moderator', 'participant', 'viewer'];
    if (!allowedRoles.includes(role)) {
      return socket.emit('error', 'Invalid role specified');
    }

    if (userId === room.hostId) {
      return socket.emit('error', 'Cannot change Host role via assign_role. Use transfer_host instead.');
    }

    const result = roomModel.assignRole(roomId, userId, role);
    if (!result) {
      return socket.emit('error', 'Participant not found in room');
    }

    const targetSocket = io.sockets.sockets.get(userId);
    if (targetSocket) {
      targetSocket.data.role = role;
    }

    io.to(roomId).emit('role_assigned', {
      userId,
      username: result.targetParticipant.username,
      role,
      participants: result.participantsList
    });
  });

  // 7. Remove Participant / Kick (Host only)
  socket.on('remove_participant', ({ userId } = {}) => {
    const roomId = socket.data.roomId;
    const room = roomModel.getRoom(roomId);
    const participant = room?.participants.get(socket.id);

    if (!participant || !roomModel.hasPermission(participant.role, 'remove_participant')) {
      return socket.emit('error', 'Not permitted: Only the Host can remove participants');
    }

    if (userId === room.hostId) {
      return socket.emit('error', 'Host cannot remove themselves from room');
    }

    const targetSocket = io.sockets.sockets.get(userId);
    const result = roomModel.removeParticipant(roomId, userId);

    if (targetSocket) {
      targetSocket.leave(roomId);
      targetSocket.emit('kicked_from_room', { message: 'You have been removed from the room by the Host' });
    }

    if (result && !result.roomEmpty) {
      io.to(roomId).emit('participant_removed', {
        userId,
        participants: result.participantsList
      });
      io.to(roomId).emit('user_left', {
        userId,
        username: result.leaver?.username,
        participants: result.participantsList
      });
    }
  });

  // 8. Transfer Host (Host only)
  socket.on('transfer_host', ({ newHostId } = {}) => {
    const roomId = socket.data.roomId;
    const room = roomModel.getRoom(roomId);
    const participant = room?.participants.get(socket.id);

    if (!participant || !roomModel.hasPermission(participant.role, 'transfer_host')) {
      return socket.emit('error', 'Not permitted: Only the current Host can transfer host status');
    }

    const result = roomModel.transferHost(roomId, newHostId);
    if (!result) {
      return socket.emit('error', 'Target participant not found in room');
    }

    const targetSocket = io.sockets.sockets.get(newHostId);
    if (targetSocket) {
      targetSocket.data.role = 'host';
    }
    socket.data.role = 'moderator';

    io.to(roomId).emit('host_transferred', {
      oldHostId: socket.id,
      newHostId,
      newHostName: result.newHost.username,
      participants: result.participantsList
    });
  });

  // 9. Request Action (Participant requests Host/Mod to play, pause, or change video)
  socket.on('request_action', ({ actionType, data } = {}) => {
    const roomId = socket.data.roomId;
    const room = roomModel.getRoom(roomId);
    const participant = room?.participants.get(socket.id);
    if (!participant) return;

    // Send action request to Host and Moderators
    room.participants.forEach((p, pSocketId) => {
      if (p.role === 'host' || p.role === 'moderator') {
        io.to(pSocketId).emit('action_requested', {
          fromUserId: socket.id,
          fromUsername: participant.username,
          actionType, // 'play', 'pause', 'change_video'
          data
        });
      }
    });
  });

  // 10. Leave Room (explicit user action)
  socket.on('leave_room', () => {
    handleUserLeave(io, socket);
  });

  // 11. Disconnect
  socket.on('disconnect', () => {
    handleUserLeave(io, socket);
  });
}

function handleUserLeave(io, socket) {
  const roomId = socket.data.roomId;
  if (!roomId) return;

  const result = roomModel.removeParticipant(roomId, socket.id);
  socket.leave(roomId);
  socket.data.roomId = null;

  if (!result) return;

  const { roomEmpty, leaver, newHost, participantsList } = result;

  if (roomEmpty) {
    console.log(`Room ${roomId} emptied and removed`);
    return;
  }

  if (newHost) {
    socket.to(roomId).emit('room_updated', {
      hostId: newHost.userId,
      hostname: newHost.username
    });
    socket.to(roomId).emit('host_transferred', {
      oldHostId: socket.id,
      newHostId: newHost.userId,
      newHostName: newHost.username,
      participants: participantsList
    });
  }

  io.to(roomId).emit('user_left', {
    userId: socket.id,
    username: leaver?.username,
    participants: participantsList
  });
}

module.exports = {
  registerSocketHandlers
};
