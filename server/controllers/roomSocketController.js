const roomModel = require('../models/roomModel');

function registerSocketHandlers(io, socket) {
  // Join Room
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

    // Inform the joining socket about the room state
    // We emit both 'joined_room' (used by client) and 'room_joined' for backward compatibility
    const joinPayload = {
      roomId,
      role,
      participants: participantsList,
      videoId: room.videoId,
      playState: room.playState,
      currentTime: room.currentTime
    };
    socket.emit('joined_room', joinPayload);
    socket.emit('room_joined', joinPayload);

    // Notify other room participants
    socket.to(roomId).emit('user_joined', {
      username,
      userId: socket.id,
      role,
      participants: participantsList
    });

    console.log(`👤 ${username} (${role}) joined room ${roomId}`);
    console.log(`Current participants: ${participantsList.map(p => p.username).join(',')}`);
    console.log('Total participants: ', participantsList.length);
  });

  // Play
  socket.on('play', () => {
    const roomId = socket.data.roomId;
    const room = roomModel.getRoom(roomId);
    const participant = room?.participants.get(socket.id);
    if (!participant || !roomModel.hasPermission(participant.role, 'play')) {
      return socket.emit('error', 'Not permitted to play video');
    }

    roomModel.updatePlayState(roomId, 'playing');
    io.to(roomId).emit('sync_state', {
      playState: room.playState,
      currentTime: room.currentTime,
      videoId: room.videoId
    });
  });

  // Pause
  socket.on('pause', () => {
    const roomId = socket.data.roomId;
    const room = roomModel.getRoom(roomId);
    const participant = room?.participants.get(socket.id);
    if (!participant || !roomModel.hasPermission(participant.role, 'pause')) {
      return socket.emit('error', 'Not permitted to pause video');
    }

    roomModel.updatePlayState(roomId, 'paused');
    io.to(roomId).emit('sync_state', {
      playState: room.playState,
      currentTime: room.currentTime,
      videoId: room.videoId
    });
  });

  // Change Video
  socket.on('change_video', ({ videoId }) => {
    const roomId = socket.data.roomId;
    const room = roomModel.getRoom(roomId);
    const participant = room?.participants.get(socket.id);
    if (!participant || !roomModel.hasPermission(participant.role, 'change_video')) {
      return socket.emit('error', 'Not permitted to change video');
    }

    roomModel.updateVideo(roomId, videoId);
    io.to(roomId).emit('sync_state', {
      playState: room.playState,
      currentTime: room.currentTime,
      videoId: room.videoId
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const result = roomModel.removeParticipant(roomId, socket.id);
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
      console.log(`New host promoted: ${newHost.username} in room ${roomId}`);
    }

    io.to(roomId).emit('user_left', {
      userId: socket.id,
      username: leaver?.username,
      participants: participantsList
    });

    console.log(`👤 ${leaver?.username} left room ${roomId}`);
    console.log(`Current participants: ${participantsList.map(p => p.username).join(',')}`);
    console.log('Total participants: ', participantsList.length);
  });
}

module.exports = {
  registerSocketHandlers
};
