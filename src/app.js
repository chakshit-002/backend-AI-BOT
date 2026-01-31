const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth.route');
const chatRoutes = require('./routes/chat.route')
const app = express();
const cors = require('cors')
const path = require('path');

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin:"http://localhost:5173",
    credentials:true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}))
app.use(express.static(path.join(__dirname,'../public')))

app.use('/api/auth',authRoutes);
app.use('/api/chat',chatRoutes);

app.get('*',(req,res)=>{
    res.sendFile(path.join(__dirname,'../public/index.html'))
})

module.exports = app;
// ,]"https://ask-me-chacksy-ai-chat-bot.netlify.app"