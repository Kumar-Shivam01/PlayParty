import { useEffect, useState, useRef } from 'react';
import YoutubePlayer from './YoutubePlayer';
import ChangeVideoForm from './ChangeVideoForm';
import { socket } from './services/socketService';

function App() {
  const [connected, setConnected] = useState(socket.connected);
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [role, setRole] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [videoId, setVideoId] = useState(null);
  const playerRef = useRef(null);

  useEffect(() => {
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    const handleJoinedRoom = ({ role: myRole, participants: roomParticipants, videoId: roomVideoId, currentTime }) => {
      setJoined(true);
      setRole(myRole);
      setParticipants(roomParticipants || []);
      if (roomVideoId) {
        setVideoId(roomVideoId);
        if (playerRef.current?.loadVideoById) {
          playerRef.current.loadVideoById(roomVideoId, currentTime || 0);
        }
      }
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

    const handleSyncState = ({ playState, currentTime, videoId: newVideoId }) => {
      if (newVideoId !== undefined) {
        setVideoId(newVideoId);
      }
      const player = playerRef.current;
      if (!player) return;

      const currentPlayingId = player.getVideoData?.()?.video_id;
      if (newVideoId && currentPlayingId !== newVideoId) {
        player.loadVideoById(newVideoId, currentTime || 0);
        return;
      }

      if (typeof currentTime === "number") {
        const drift = Math.abs(player.getCurrentTime() - currentTime);
        if (drift > 1.5) {
          player.seekTo(currentTime, true);
        }
      }

      if (playState === "playing" && player.getPlayerState() !== 1) {
        player.playVideo();
      }
      if (playState === "paused" && player.getPlayerState() !== 2) {
        player.pauseVideo();
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("joined_room", handleJoinedRoom);
    socket.on("room_joined", handleJoinedRoom);
    socket.on("user_joined", handleUserJoined);
    socket.on("user_left", handleUserLeft);
    socket.on("room_updated", handleRoomUpdated);
    socket.on("sync_state", handleSyncState);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("joined_room", handleJoinedRoom);
      socket.off("room_joined", handleJoinedRoom);
      socket.off("user_joined", handleUserJoined);
      socket.off("user_left", handleUserLeft);
      socket.off("room_updated", handleRoomUpdated);
      socket.off("sync_state", handleSyncState);
    };
  }, []);

  const handleJoin = (e) => {
    e?.preventDefault();
    if (!roomId.trim() || !username.trim()) return;
    socket.emit("join_room", { roomId: roomId.trim(), username: username.trim() });
  };

  const handlePlayerReady = (player) => {
    playerRef.current = player;
    if (videoId) {
      player.loadVideoById(videoId, 0);
    }
  };

  const canControl = role === "host" || role === "moderator";

  if (!joined) {
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
              onClick={() => socket.emit("play")}
            >
              ▶ Play
            </button>
            <button
              style={{ padding: "8px 20px", cursor: "pointer", fontWeight: "bold", backgroundColor: "#f59e0b", color: "white", border: "none", borderRadius: 5 }}
              onClick={() => socket.emit("pause")}
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
