const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');
const messageModel = require('../models/message.model');
const cookie = require('cookie');
const aiService = require("../services/ai.service");
const { createMemory, queryMemory } = require("../services/vector.service");
const chatModel = require('../models/chat.model');


async function initSocketServer(httpServer) {

    const io = new Server(httpServer, {
        cors: {
            origin: "http://localhost:5173",
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // --- Middleware,  authentication krege idhar ham
    io.use(async (socket, next) => {
        try {
            const cookies = cookie.parse(socket.handshake.headers.cookie || '');

            if (!cookies.token) {
                return next(new Error("Authentication error: No token provided"));
            }

            const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET);
            const user = await userModel.findById(decoded.id).select("-password"); // Password exclude kr diya hai

            if (!user) {
                return next(new Error("Authentication error: User not found"));
            }

            socket.user = user;
            next();
        } catch (err) {
            console.error("Socket Auth Middleware Error:", err.message);
            return next(new Error("Authentication error: Invalid or expired token"));
        }
    });

    io.on('connection', (socket) => {
        console.log("Connected User:", socket.user.fullName);

        socket.on("ai_message", async (messagePayload) => {
            try {

                let chatId = messagePayload.chat;
                if (!chatId) {
                    const newChat = await chatModel.create({
                        user: socket.user._id,
                        title: messagePayload.content.slice(0, 20)
                    })
                    chatId = newChat._id;
                }
                // 1. Basic Validation
                if (!messagePayload.content || !chatId) {
                    return socket.emit("error_message", { message: "Content and Chat ID are required" });
                }

                // 2. Save User Message DB mei ,vector creation 
                const [message, vectors] = await Promise.all([
                    messageModel.create({
                        chat: chatId,
                        user: socket.user._id,
                        content: messagePayload.content,
                        role: "user"
                    }),
                    aiService.generateVectors(messagePayload.content)
                ]);
                console.log("vectors generated", vectors);

                // saving  in vector memory 
                await createMemory({
                    vectors,
                    messageId: message._id,
                    metadata: {
                        chat: chatId.toString(),
                        user: socket.user._id.toString(),
                        text: messagePayload.content
                    }
                })



                // 3. Query for related data in pinecone & Get History for Context

                const [memory, chatHistory] = await Promise.all([
                    queryMemory({
                        queryVector: vectors,
                        limit: 3,
                        metadata: { user: socket.user._id.toString() }
                    }),
                    messageModel.find({ chat: chatId }).sort({ createdAt: -1 }).limit(20).lean().then(res => res.reverse())
                ]);
                console.log("memory fetched", memory);
                //STM -> 
                const stm = chatHistory.map(item => {
                    return {
                        role: item.role,
                        parts: [{ text: item.content }]
                    }
                })

                //LTM 
                const ltm = [
                    {
                        role: "user",
                        parts: [{
                            text: `
                        I am providing you with some of previous conversation as a context: Give reply base on it 

                        ${memory.map(mem => mem.metadata.text).join("\n")}

                        `
                        }]
                    }
                ]


                // 4. Generate AI Response with Specific Error Catching
                let response;
                try {
                    // response = await aiService.generateResponse(chatHistory.map(item => ({
                    //     role: item.role,
                    //     parts: [{ text: item.content }]
                    // })));
                    response = await aiService.generateResponse([...ltm, ...stm])

                } catch (aiErr) {
                    console.error("Gemini API Error:", aiErr.message);
                    const errorMessage = "Bhai, AI thoda thak gaya hai (Quota Limit). Thodi der baad try karo!";
                    await messageModel.create({
                        chat: chatId,
                        user: socket.user._id,
                        content: errorMessage,
                        role: "model"
                    });
                    return socket.emit("ai_response", {
                        content: errorMessage,
                        chat: chatId
                    });
                }

                if (response) {
                    // 5.Emit AI Response
                    socket.emit("ai_response", {
                        content: response,
                        chat: chatId
                    });

                    // 6. Save AI Response to memory & generate its Vectors 
                    const [responseMessage, responseVectors] = await Promise.all([
                        messageModel.create({
                            chat: chatId,
                            user: socket.user._id,
                            content: response,
                            role: "model"
                        }),
                        aiService.generateVectors(response)
                    ])


                    // saving response in vector memory

                    await createMemory({
                        vectors: responseVectors,
                        messageId: responseMessage._id,
                        metadata: {
                            chat: chatId.toString(),
                            user: socket.user._id.toString(),
                            text: response
                        }
                    })


                }

            } catch (err) {
                console.error("Internal Socket Event Error:", err);
                socket.emit("error_message", { message: "Internal server error occurred" });
            }
        });

        socket.on('disconnect', () => {
            console.log("User disconnected:", socket.id);
        });
    });
}

module.exports = initSocketServer;