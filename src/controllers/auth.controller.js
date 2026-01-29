const userModel = require('../models/user.model')
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

async function registerUser(req, res) {
    const { email, password, fullName: { firstName, lastName } } = req.body;

    const isUserExists = await userModel.findOne({ email });

    if (isUserExists) {
        return res.status(400).json({
            message: "User Already Exists"
        })
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
        email,
        password: hashedPassword,
        fullName: {
            firstName,
            lastName
        }
    })

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.cookie("token", token, {
        httpOnly: true,
        secure: true,      
        sameSite: "None",  
        maxAge: 24 * 60 * 60 * 1000
    });

    res.status(201).json({
        message: "user registered Successfully",
        user: {
            fullName: user.fullName,
            email: user.email,
            id: user._id
        }
    })
    console.log("User registered Successfully")
}

async function loginUser(req, res) {
    const { email, password } = req.body;

    const isUserExists = await userModel.findOne({ email });

    if (!isUserExists) {
        return res.status(400).json({
            message: "invalid credentials"
        })
    }

    const isPasswordvalid = await bcrypt.compare(password, isUserExists.password);

    if (!isPasswordvalid) {
        return res.status(400).json({
            message: "invalid password"
        })
    }

    const token = jwt.sign({ id: isUserExists._id }, process.env.JWT_SECRET);

    res.cookie("token", token, {
        httpOnly: true,
        secure: true,     
        sameSite: "None",  
        maxAge: 24 * 60 * 60 * 1000
    });

    res.status(200).json({
        message: "User logged in Successfully",
        user: {
            fullName: isUserExists.fullName,
            email: isUserExists.email,
            id: isUserExists._id
        }

    })
    console.log("User loggedin Successfully")
}


async function logoutUser(req, res) {
    try {
        res.cookie("token", "", {
            httpOnly: true,
            expires: new Date(0),
            sameSite: "Strict",
            secure: process.env.NODE_ENV === 'development',
        })
        res.status(200).json({
            success: true,
            message: "Logged out successfully! See you soon, bro."
        });
    } catch (err) {
        console.error("Logout Error:", err);
        res.status(500).json({ success: false, message: "Server error during logout" });
    }
}

module.exports = { registerUser, loginUser, logoutUser };