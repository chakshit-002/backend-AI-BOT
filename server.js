require('dotenv').config();
const app = require('./src/app')
const connectDB = require("./src/db/db")
const initSocketServer = require("./src/sockets/socket.server")
const PORT = process.env.PORT || 3000;
const httpServer = require('http').createServer(app);




connectDB();
initSocketServer(httpServer);

httpServer.listen(PORT,()=>{
    console.log("HTTP Server is running on port no. ", PORT)
})


// app.listen(3000,()=>{
//     console.log("Server is running  on port no. 3000")
// })
//socket mei app nahihoga chalega httpServer + express  mount hokr chlega