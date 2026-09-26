import { useEffect, useState, useRef } from 'react';
import YoutubePlayer from './components/YoutubePlayer';
import ChangeVideoForm from './components/ChangeVideoForm';
import PlaybackControls from './components/PlaybackControls';
import ParticipantsList from './components/ParticipantsList';
import ActionRequestToast from './components/ActionRequestToast';
import { socket } from './services/socketService';

function syncPlayer(player, { videoId, currentTime = 0, playState = "paused" }, forceLoad = false) {
  if (!player || !videoId) return;

  const startSeconds = Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : 0;
  if (forceLoad || player.getVideoData?.()?.video_id !== videoId) {
    const method = playState === "playing" ? "loadVideoById" : "cueVideoById";
    player[method]({ videoId, startSeconds });
    return;
  }

  if (Math.abs((player.getCurrentTime?.() || 0) - startSeconds) > 1.5) {
    player.seekTo(startSeconds, true);
  }
  if (playState === "playing" && player.getPlayerState?.() !== 1) {
    player.playVideo();
  }
  if (playState === "paused" && player.getPlayerState?.() !== 2) {
    player.pauseVideo();
  }
}

function App() {
  const [connected, setConnected] = useState(socket.connected);
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [role, setRole] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [videoId, setVideoId] = useState(null);
  const [playState, setPlayState] = useState("paused");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [notification, setNotification] = useState(null);

  const playerRef = useRef(null);
  const roomPlaybackRef = useRef({ videoId: null, currentTime: 0, playState: "paused" });

  const showNotification = (msg, type = "info") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    const handleJoinedRoom = ({ role: myRole, participants: roomParticipants, videoId: roomVideoId, currentTime: curTime, playState: state }) => {
      setJoined(true);
      setRole(myRole);
      setParticipants(roomParticipants || []);
      const playback = {
        videoId: roomVideoId || null,
        currentTime: curTime || 0,
        playState: state || "paused"
      };
      roomPlaybackRef.current = playback;
      setVideoId(playback.videoId);
      setPlayState(playback.playState);
      setCurrentTime(playback.currentTime);
      syncPlayer(playerRef.current, playback);
    };

    const handleUserJoined = ({ username: user, role: userRole, participants: roomParticipants }) => {
      setParticipants(roomParticipants || []);
      showNotification(`${user} joined as ${userRole}`);
    };

    const handleUserLeft = ({ username: user, participants: roomParticipants }) => {
      setParticipants(roomParticipants || []);
      if (user) showNotification(`${user} left the room`);
    };

    const handleRoleAssigned = ({ userId, username: user, role: newRole, participants: roomParticipants }) => {
      setParticipants(roomParticipants || []);
      if (socket.id === userId) {
        setRole(newRole);
        showNotification(`Your role was updated to: ${newRole.toUpperCase()}`, "success");
      } else {
        showNotification(`${user}'s role was updated to ${newRole}`);
      }
    };

    const handleHostTransferred = ({ newHostId, newHostName, participants: roomParticipants }) => {
      setParticipants(roomParticipants || []);
      if (socket.id === newHostId) {
        setRole('host');
        showNotification("You are now the Host of this room! 👑", "success");
      } else {
        showNotification(`${newHostName} is now the Host!`);
      }
    };

    const handleParticipantRemoved = ({ userId, participants: roomParticipants }) => {
      setParticipants(roomParticipants || []);
    };

    const handleKicked = ({ message }) => {
      setJoined(false);
      setRole(null);
      setParticipants([]);
      alert(message || "You have been removed from the room.");
    };

    const handleActionRequested = (req) => {
      setPendingRequest(req);
    };

    const handleSyncState = ({ playState: newState, currentTime: newTime, videoId: newVideoId }) => {
      const playback = {
        videoId: newVideoId ?? roomPlaybackRef.current.videoId,
        currentTime: newTime ?? roomPlaybackRef.current.currentTime,
        playState: newState ?? roomPlaybackRef.current.playState
      };
      roomPlaybackRef.current = playback;
      setVideoId(playback.videoId);
      setPlayState(playback.playState);
      setCurrentTime(playback.currentTime);
      syncPlayer(playerRef.current, playback);
    };

    const handleError = (errorMsg) => {
      showNotification(typeof errorMsg === 'string' ? errorMsg : 'An error occurred', 'error');
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("joined_room", handleJoinedRoom);
    socket.on("room_joined", handleJoinedRoom);
    socket.on("user_joined", handleUserJoined);
    socket.on("user_left", handleUserLeft);
    socket.on("role_assigned", handleRoleAssigned);
    socket.on("host_transferred", handleHostTransferred);
    socket.on("participant_removed", handleParticipantRemoved);
    socket.on("kicked_from_room", handleKicked);
    socket.on("action_requested", handleActionRequested);
    socket.on("sync_state", handleSyncState);
    socket.on("error", handleError);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("joined_room", handleJoinedRoom);
      socket.off("room_joined", handleJoinedRoom);
      socket.off("user_joined", handleUserJoined);
      socket.off("user_left", handleUserLeft);
      socket.off("role_assigned", handleRoleAssigned);
      socket.off("host_transferred", handleHostTransferred);
      socket.off("participant_removed", handleParticipantRemoved);
      socket.off("kicked_from_room", handleKicked);
      socket.off("action_requested", handleActionRequested);
      socket.off("sync_state", handleSyncState);
      socket.off("error", handleError);
    };
  }, []);

  // Update current time locally during playback for scrub slider
  useEffect(() => {
    let interval = null;
    if (playState === "playing") {
      interval = setInterval(() => {
        if (playerRef.current?.getCurrentTime) {
          const t = playerRef.current.getCurrentTime();
          if (Number.isFinite(t)) setCurrentTime(t);
        }
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [playState]);

  const handleJoin = (e) => {
    e?.preventDefault();
    if (!roomId.trim() || !username.trim()) return;
    socket.emit("join_room", { roomId: roomId.trim(), username: username.trim() });
  };

  const handleLeave = () => {
    socket.emit("leave_room");
    setJoined(false);
    setRole(null);
    setParticipants([]);
    setVideoId(null);
  };

  const handlePlayerReady = (player) => {
    playerRef.current = player;
    syncPlayer(player, roomPlaybackRef.current, true);
  };

  const getPlayerTime = () => {
    const cur = playerRef.current?.getCurrentTime?.();
    return Number.isFinite(cur) && cur >= 0 ? cur : currentTime;
  };

  const canControl = role === "host" || role === "moderator";

  // RBAC Socket Actions
  const handlePlay = () => {
    socket.emit("play", { currentTime: getPlayerTime() });
  };

  const handlePause = () => {
    socket.emit("pause", { currentTime: getPlayerTime() });
  };

  const handleSeek = (time) => {
    socket.emit("seek", { time });
  };

  const handleChangeVideo = (id) => {
    socket.emit("change_video", { videoId: id });
  };

  const handleAssignRole = (userId, newRole) => {
    socket.emit("assign_role", { userId, role: newRole });
  };

  const handleRemoveParticipant = (userId) => {
    socket.emit("remove_participant", { userId });
  };

  const handleTransferHost = (newHostId) => {
    socket.emit("transfer_host", { newHostId });
  };

  // Non-privileged participant requests
  const handleRequestAction = (actionType, data = null) => {
    socket.emit("request_action", { actionType, data });
    showNotification(`Request to ${actionType} sent to Host/Mods`, "info");
  };

  const handleApproveRequest = (req) => {
    if (req.actionType === "play") handlePlay();
    if (req.actionType === "pause") handlePause();
    if (req.actionType === "change_video") handleChangeVideo(req.data.videoId);
    setPendingRequest(null);
  };

  // Join screen
  if (!joined) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>🍿</span> PlayParty
            </h1>
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-500'}`}></span>
              <span className={connected ? 'text-emerald-400' : 'text-rose-400'}>
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </span>
          </div>

          <p className="text-slate-400 text-sm mb-6">
            Watch YouTube videos together with friends in real-time. Full sync and role-based permissions.
          </p>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Room Code
              </label>
              <input
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="e.g. anime-night-42"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Your Username
              </label>
              <input
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="e.g. Alex"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={!connected}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg shadow-lg shadow-blue-600/30 transition cursor-pointer mt-2"
            >
              Join or Create Room
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <span className="text-xs text-slate-400">
              Room creator automatically becomes <strong>Host</strong> 👑
            </span>
          </div>
        </div>
      </div>
    );
  }

  // In-room view
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold border ${
          notification.type === 'error'
            ? 'bg-rose-950 border-rose-800 text-rose-200'
            : notification.type === 'success'
            ? 'bg-emerald-950 border-emerald-800 text-emerald-200'
            : 'bg-slate-800 border-slate-700 text-slate-200'
        }`}>
          {notification.msg}
        </div>
      )}

      {/* Participant Request Toast for Host/Mod */}
      {canControl && (
        <ActionRequestToast
          request={pendingRequest}
          onApprove={handleApproveRequest}
          onDismiss={() => setPendingRequest(null)}
        />
      )}

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🍿</span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white">PlayParty</h1>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono border border-slate-700">
                  Room: {roomId}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                You are: <strong className="text-blue-400 capitalize">{username}</strong> ({role})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                navigator.clipboard?.writeText?.(roomId);
                showNotification("Room code copied to clipboard!", "success");
              }}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition"
            >
              📋 Copy Code
            </button>
            <button
              onClick={handleLeave}
              className="text-xs bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-semibold px-3 py-1.5 rounded-lg border border-rose-500/30 transition"
            >
              Leave Room
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Player & Controls (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <YoutubePlayer
            videoId={videoId}
            onPlayerReady={handlePlayerReady}
            onDurationChange={(d) => setDuration(d)}
          />

          <PlaybackControls
            playState={playState}
            currentTime={currentTime}
            duration={duration}
            canControl={canControl}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            onRequestAction={handleRequestAction}
          />

          <ChangeVideoForm
            canControl={canControl}
            onConfirm={handleChangeVideo}
            onRequestVideoChange={(vid) => handleRequestAction("change_video", { videoId: vid })}
          />
        </div>

        {/* Right Column: Participants & Role Control Sidebar */}
        <div className="space-y-4">
          <ParticipantsList
            participants={participants}
            currentUserId={socket.id}
            currentRole={role}
            onAssignRole={handleAssignRole}
            onRemoveParticipant={handleRemoveParticipant}
            onTransferHost={handleTransferHost}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
