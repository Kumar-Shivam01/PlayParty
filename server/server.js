const express = require("express");
const { Server } = require('socket.io');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const videoRoutes = require('./routes/videoRoutes');
const { registerSocketHandlers } = require('./controllers/roomSocketController');

const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);

// Default welcome route
app.get('/', (req, res) => {
  res.send('Hii this is PlayParty server running...');
});

// API Routes
app.use('/api', videoRoutes);

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    credentials: true
  }
});

io.on('connection', (socket) => {
  registerSocketHandlers(io, socket);
});

const PORT = process.env.PORT || 3004;
server.listen(PORT, () => {
  console.log(`PlayParty server is running on http://localhost:${PORT}`);
});
