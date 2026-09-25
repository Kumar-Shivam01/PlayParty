const express = require("express");
const {Server} = require('socket.io');
const http = require('http')
const cors = require('cors');
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
const rooms = new Map()
io.on('connection',(socket)=>{
    console.log(`Client connected: ${socket.id}`)
    socket.on('disconnect',()=>{
        console.log(`Client disconnected: ${socket.id}`)
        
        const roomId = socket.data.roomId
        if(!roomId) return
        const room = rooms.get(roomId)
        if(!room) return

        const leaver = room.participants.get(socket.id)
        room.participants.delete(socket.id);
        socket.leave(room)

        if(room.participants.size === 0){
            rooms.delete(roomId); //last one out then clean up the room
            console.log(`Room ${roomId} emptied and removed`)
            return;
        }
        //Promote next participant to host if host left
        if(room.hostId === socket.id){
            const nextHostId = room.participants.keys().next().value;
            room.hostId = nextHostId
            const nextHost = room.participants.get(nextHostId);
            nextHost.role = 'host'
            socket.to(roomId).emit('room_updated',{hostId:nextHostId,hostname:nextHost.username})
            console.log(`New host promoted: ${nextHost.username} in room ${roomId}`)
        }

        const participantsList = [...room.participants.values()];
        io.to(roomId).emit('user_left',{
            userId: socket.id,
            username: leaver?.username,
            participants: participantsList
        })

        console.log(`👤 ${leaver?.username} left room ${roomId}`)
        console.log(`Current participants: ${participantsList.map(p=>p.username).join(',')}`)
        console.log('Total participants: ',participantsList.length)
    })
    socket.on('join_room',({roomId,username})=>{
        if(!roomId || !username) return socket.emit('error','roomId and username are required!')
        let room = rooms.get(roomId)
        let role
        if(!room){
            //first person in -> room is created and they become host
            room = {hostId: socket.id,participants: new Map()},
            rooms.set(roomId,room),
            role = 'host'
        }else{
            role = 'participant'
        }
        room.participants.set(socket.id, {userId: socket.id,username,role})
        socket.join(roomId)
        socket.data.roomId = roomId;
        socket.data.username = username
        socket.data.role = role

        const participantsList = [...room.participants.value()];

        //tell the joiner their role and who are the participants
        socket.emit('room_joined',{
            roomId, 
            role,
            participants: participantsList
        })
        socket.to(roomId).emit('user_joined',{
            username,
            userId: socket.id,
            role,
            participants: participantsList
        })
        console.log(`👤 ${username} (${role}) joined room ${roomId}`)
        console.log(`Current participants: ${participantsList.map(p=>p.username).join(',')}`)
        console.log('Total participants: ',participantsList.length)
    })
})
server.listen(process.env.PORT,()=>{
    console.log(`PlayParty server is running on http://localhost:${process.env.PORT}`)
})