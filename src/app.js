const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth.route');
const chatRoutes = require('./routes/chat.route')
const app = express();
const cors = require('cors')

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin:"http://localhost:5173",
    credentials:true
}))

app.use('/api/auth',authRoutes);
app.use('/api/chat',chatRoutes);

module.exports = app;