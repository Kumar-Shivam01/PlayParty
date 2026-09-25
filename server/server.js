const express = require("express");
const {Server} = require('socket.io');
const http = require('http')
const cors = require('cors')
require('dotenv').config()

const app = express();
app.use(express.json())
app.use(cors())

const server = http.createServer(app)
app.get('/',(req,res)=>{
    res.send('Hii this is PlayParty server running...')
})
const io = new Server(server,{ //Socket.IO server with CORS configuration
    cors:{ 
        origin: "http://localhost:5173",
        credentials: true
    }
})
io.on('connection',(socket)=>{
    console.log(`Client connected: ${socket.id}`)
    socket.on('disconnect',()=>{
        console.log(`Client disconnected: ${socket.id}`)
    })
})
server.listen(process.env.PORT,()=>{
    console.log(`PlayParty server is running on http://localhost:${process.env.PORT}`)
})