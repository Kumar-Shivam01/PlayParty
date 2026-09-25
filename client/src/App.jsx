import {io} from 'socket.io-client'
import {useEffect,useState} from 'react';

const socket = io("http://localhost:3004")

function App(){
  const [connected,setConnected] = useState(false);

  useEffect(()=>{
    socket.on('connect',()=>{
      console.log(`Connected to server: ${socket.id}`)
      setConnected(true)
    })
    socket.on('disconnect',()=>{
      setConnected(false)
    })
    return ()=>{
      socket.off('connect');
      socket.off('disconnect');
    }
  },[])
  
  return(
     <div>
      <h1>PlayParty Connection status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</h1>
      <p>Socket ID: {socket.id}</p>
     </div>
  )
}
export default App
    