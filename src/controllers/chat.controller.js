const chatModel = require('../models/chat.model')
const mongoose = require('mongoose');
const messageModel = require('../models/message.model');
const vectorServices = require('../services/vector.service')
async function createChat(req, res) {

    try {
        const { title } = req.body;
        const user = req.user;

        if (!title) {
            return res.status(400).json({
                message: "Title is Required , Bro !!"
            })
        }
        if (!user) {
            return res.status(401).json({
                message: "invalid User, unauthorized"
            })
        }
        const chat = await chatModel.create({
            user: user._id,
            title
        })

        res.status(201).json({
            message: "Chat Created Successfully",
            chat: {
                _id: chat._id,
                title: chat.title,
                lastAcitivity: chat.lastActivity,
                user: chat.user
            }
        })
    }
    catch (err) {
        console.error("Having Error in creating chat ", err);
        res.status(500).json({
            message: "internal Server error"
        })
    }
    console.log("Chat Created Successfully");
}

async function getChats(req, res) {

    try {
        const user = req.user;
        if (!user || !user._id) {
            return res.status(401).json({
                message: "unauthorized user , you must be login",
                success: false
            })
        }
        const chats = await chatModel.find({ user: user._id }).sort({ lastActivity: -1 });

        if (!chats || chats.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No chats were found",
                chats: []
            })
        }

        res.status(200).json({
            success: true,
            message: "chats retrieved successfully",
            chats: chats.map(chat => ({
                _id: chat._id,
                title: chat.title,
                lastActivity: chat.lastActivity,
                user: chat.user
            }))
        })

    }
    catch (err) {
        console.error("Error in getting chats");
        res.status(500).json({
            message: "Having trouble to getting  chats from database",
            success: false,
            err
        })
    }
}

async function getMessages(req, res) {
    try {
        const chatId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(chatId)) {
            return res.status(400).json({
                success: false,
                message: "chatid is not valid"
            })
        }

        const messages = await messageModel.find({ chat: chatId }).sort({ createdAt: 1 });

        res.status(200).json({
            success: true,
            count: messages.length,
            message: "Messages Retrieved Successfully",
            messages: messages
        })

    } catch (err) {
        console.error("Error in getMessages", err);
        if (err.name === 'CastError') {
            return res.status(400).json({
                message: "Invalid chat format"
            })
        }

        res.status(500).json({
            success: false,
            message: "Server Error",
        })
    }
}

async function renameChat(req, res) {
    try {
        const chatId = req.params.id;
        const { title } = req.body;
        console.log("Renaming chat", chatId, title);
        if (!title || title.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Title is required , Your title is empty"
            })
        }

        const chat = await chatModel.findOneAndUpdate(
            { _id: chatId, user: req.user._id },
            { title: title.trim() },
            { new: true }
        );

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found"
            })
        }
        res.status(200).json({
            success: true,
            message: "chat renamed successfully",
            chat
        })
    }
    catch (err) {
        console.error("error in renaming chat", err);
        res.status(500).json({
            success: false,
            message: "internal server error"
        })
    }
}


async function deleteChat(req, res) {
    try {
        const { id } = req.params; // Ye chat ID hai
        const userId = req.user._id;

        // STEP 1: Pehle check karo chat exist karti hai ya nahi
        const chatExists = await chatModel.findOne({ _id: id, user: userId });
        if (!chatExists) {
            return res.status(404).json({ success: false, message: "Chat nahi mili!" });
        }

        // STEP 2: MongoDB se saari message IDs fetch karo (DELETE SE PEHLE)
        const messages = await messageModel.find({ chat: id }).select('_id');
        const idsToDelete = messages.map(m => m._id.toString());

        // STEP 3: Pinecone cleanup (ID-based delete, filter ka jhanjhat hi khatam)
        if (idsToDelete.length > 0) {
            try {
                // Vector service ko sirf IDs ki list bhejo
                await vectorServices.deleteByIDs(idsToDelete);
                console.log(` Pinecone cleaned: ${idsToDelete.length} vectors.`);
            } catch (vErr) {
                console.error("Vector cleanup failed, but continuing DB delete:", vErr.message);
            }
        }

        // STEP 4: Ab MongoDB se data delete karo
        await messageModel.deleteMany({ chat: id });
        await chatModel.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Chat, Messages aur Vector Memory sab saaf!"
        });

    } catch (err) {
        console.error("Error in deleting chat:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}
module.exports = {
    createChat,
    getChats,
    getMessages,
    renameChat,
    deleteChat
}