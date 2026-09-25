const express = require("express");
require('dotenv').config()

const app = express();
app.use(express.json())

app.get('/',(req,res)=>{
    res.send('Hii this is PlayParty server running...')
})

app.listen(process.env.PORT,()=>{
    console.log(`PlayParty server is running on http://localhost:${process.env.PORT}`)
})