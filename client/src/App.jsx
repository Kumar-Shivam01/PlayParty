import { io } from 'socket.io-client'
import { useEffect, useState } from 'react';

const socket = io("http://localhost:3004")

function App() {
  const [connected, setConnected] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [role, setRole] = useState(null);
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("joined_room", ({ role, participants }) => {
      setJoined(true);
      setRole(role);
      setParticipants(participants);
    });

    socket.on("user_joined", ({ participants }) => setParticipants(participants));
    socket.on("user_left", ({ participants }) => setParticipants(participants));

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("joined_room");
      socket.off("user_joined");
      socket.off("user_left");
    };
  }, []);
  const handleJoin = () => {
    if (!roomId || !username) return;
    socket.emit("join_room", { roomId, username });
  };

  if (!joined) {
    return (
      <div style={{ padding: 40, fontFamily: "sans-serif" }}>
        <h1>Watch Party</h1>
        <p>Status: {connected ? "🟢 Connected" : "🔴 Disconnected"}</p>
        <input placeholder="Room code" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
        <input placeholder="Your name" value={username} onChange={(e) => setUsername(e.target.value)} />
        <button onClick={handleJoin}>Join / Create Room</button>
      </div>
    );
  }
  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Room: {roomId}</h1>
      <p>Your role: <strong>{role}</strong></p>
      <h3>Participants</h3>
      <ul>
        {participants.map((p) => (
          <li key={p.userId}>{p.username} — {p.role}</li>
        ))}
      </ul>
    </div>
  )
}
export default App
