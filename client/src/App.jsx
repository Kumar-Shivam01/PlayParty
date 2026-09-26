import { useEffect, useState, useRef } from 'react';
import YoutubePlayer from './YoutubePlayer';
import ChangeVideoForm from './ChangeVideoForm';
import { socket } from './services/socketService';

function syncPlayer(player, { videoId, currentTime = 0, playState = "paused" }, forceLoad = false) {
  if (!player || !videoId) return;

  const startSeconds = Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : 0;
  if (forceLoad || player.getVideoData?.()?.video_id !== videoId) {
    const method = playState === "playing" ? "loadVideoById" : "cueVideoById";
    player[method]({ videoId, startSeconds });
    return;
  }

  if (Math.abs((player.getCurrentTime?.() || 0) - startSeconds) > 1.5) player.seekTo(startSeconds, true);
  if (playState === "playing" && player.getPlayerState?.() !== 1) player.playVideo();
  if (playState === "paused" && player.getPlayerState?.() !== 2) player.pauseVideo();
}

function App() {
  const [connected, setConnected] = useState(socket.connected);
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [role, setRole] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [videoId, setVideoId] = useState(null);
  const playerRef = useRef(null);
  const roomPlaybackRef = useRef({ videoId: null, currentTime: 0, playState: "paused" });

  useEffect(() => { // handle the connect and disconnect events
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    // handle the joined room event
    const handleJoinedRoom = ({ role: myRole, participants: roomParticipants, videoId: roomVideoId, currentTime, playState }) => {
      setJoined(true);
      setRole(myRole);
      setParticipants(roomParticipants || []);
      const playback = { videoId: roomVideoId || null, currentTime: currentTime || 0, playState: playState || "paused" };
      roomPlaybackRef.current = playback;
      setVideoId(playback.videoId);
      syncPlayer(playerRef.current, playback);
    };

    const handleUserJoined = ({ participants: roomParticipants }) => {
      setParticipants(roomParticipants || []);
    };

    const handleUserLeft = ({ participants: roomParticipants }) => {
      setParticipants(roomParticipants || []);
    };

    const handleRoomUpdated = ({ hostId, hostname }) => {
      if (socket.id === hostId) {
        setRole('host');
      }
    };

    const handleSyncState = ({ playState, currentTime, videoId: newVideoId }) => { // synchronise state across all clients
      const playback = {
        videoId: newVideoId ?? roomPlaybackRef.current.videoId,
        currentTime: currentTime ?? roomPlaybackRef.current.currentTime,
        playState: playState ?? roomPlaybackRef.current.playState
      };
      roomPlaybackRef.current = playback;
      setVideoId(playback.videoId);
      syncPlayer(playerRef.current, playback);
    };

    socket.on("connect", handleConnect); // handle the connection event
    socket.on("disconnect", handleDisconnect); // handle the disconnection event
    socket.on("joined_room", handleJoinedRoom);
    socket.on("room_joined", handleJoinedRoom);
    socket.on("user_joined", handleUserJoined);
    socket.on("user_left", handleUserLeft);
    socket.on("room_updated", handleRoomUpdated);
    socket.on("sync_state", handleSyncState);

    return () => {
      socket.off("connect", handleConnect);  // remove the connection event listener
      socket.off("disconnect", handleDisconnect);  // remove the disconnection event listener
      socket.off("joined_room", handleJoinedRoom); // remove the joined room event listener
      socket.off("room_joined", handleJoinedRoom); // remove the room joined event listener
      socket.off("user_joined", handleUserJoined); // remove the user joined event listener
      socket.off("user_left", handleUserLeft); // remove the user left event listener
      socket.off("room_updated", handleRoomUpdated); // remove the room updated event listener
      socket.off("sync_state", handleSyncState); // remove the sync state event listener
    };
  }, []);

  const handleJoin = (e) => {  // handle the join event
    e?.preventDefault();
    if (!roomId.trim() || !username.trim()) return;
    socket.emit("join_room", { roomId: roomId.trim(), username: username.trim() });
  };

  const handlePlayerReady = (player) => {
    playerRef.current = player;  // set the player ref
    syncPlayer(player, roomPlaybackRef.current, true);
  };

  const getPlayerTime = () => {
    const currentTime = playerRef.current?.getCurrentTime?.();
    return Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : 0;
  };

  const canControl = role === "host" || role === "moderator"; // check if the user is host or moderator

  if (!joined) { // if the user is not joined
    return (
      <div style={{ maxWidth: 480, margin: "60px auto", padding: 30, fontFamily: "system-ui, sans-serif", border: "1px solid #e0e0e0", borderRadius: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <h1 style={{ marginTop: 0, marginBottom: 10, color: "#111" }}>Watch Party</h1>
        <p style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.95rem", color: "#555" }}>
          Status: {connected ? "🟢 Connected" : "🔴 Disconnected"}
        </p>
        <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: "0.9rem", fontWeight: "bold" }}>Room Code</label>
            <input
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #ccc", borderRadius: 6, boxSizing: "border-box" }}
              placeholder="e.g. 123"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              required
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: "0.9rem", fontWeight: "bold" }}>Your Name</label>
            <input
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #ccc", borderRadius: 6, boxSizing: "border-box" }}
              placeholder="e.g. Alex"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            style={{
              padding: "10px 16px",
              backgroundColor: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              cursor: "pointer",
              marginTop: 10
            }}
          >
            Join / Create Room
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "20px auto", padding: "20px 40px", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eee", paddingBottom: 15 }}>
        <div>
          <h1 style={{ margin: 0 }}>Room: <span style={{ color: "#2563eb" }}>{roomId}</span></h1>
          <p style={{ margin: "5px 0 0", color: "#666" }}>
            Your role: <strong style={{ textTransform: "capitalize", color: "#111" }}>{role}</strong>
          </p>
        </div>
        <span style={{ fontSize: "0.9rem", color: connected ? "#16a34a" : "#dc2626" }}>
          {connected ? "● Connected" : "● Disconnected"}
        </span>
      </header>

      {/* YouTube Player */}
      <YoutubePlayer videoId={videoId} onPlayerReady={handlePlayerReady} />

      {/* Controls and Video Input */}
      {canControl ? (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 15 }}>
            <button
              style={{ padding: "8px 20px", cursor: "pointer", fontWeight: "bold", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: 5 }}
              onClick={() => socket.emit("play", { currentTime: getPlayerTime() })}
            >
              ▶ Play
            </button>
            <button
              style={{ padding: "8px 20px", cursor: "pointer", fontWeight: "bold", backgroundColor: "#f59e0b", color: "white", border: "none", borderRadius: 5 }}
              onClick={() => socket.emit("pause", { currentTime: getPlayerTime() })}
            >
              ⏸ Pause
            </button>
          </div>
          <ChangeVideoForm onConfirm={(id) => socket.emit("change_video", { videoId: id })} />
        </div>
      ) : (
        <p style={{ color: "#777", fontStyle: "italic" }}>
          Only the host or moderator can change videos and control playback.
        </p>
      )}

      {/* Participants List */}
      <div style={{ marginTop: 30, borderTop: "1px solid #eee", paddingTop: 15 }}>
        <h3 style={{ margin: "0 0 10px 0" }}>Participants ({participants.length})</h3>
        <ul style={{ listStyleType: "none", padding: 0, margin: 0, display: "flex", flexWrap: "wrap", gap: 10 }}>
          {participants.map((p) => (
            <li
              key={p.userId}
              style={{
                backgroundColor: "#f3f4f6",
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: "0.9rem",
                display: "inline-flex",
                alignItems: "center",
                gap: 6
              }}
            >
              <strong>{p.username}</strong>
              <span style={{ color: "#6b7280", fontSize: "0.8rem" }}>({p.role})</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
