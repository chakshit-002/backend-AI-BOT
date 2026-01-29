const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model')

async function authUser(req,res,next){
    const {token} = req.cookies;
    
    if(!token){
        return res.status(401).json({
            message: "Unauthorized Access no token found"
        })
    }

    try{
        const decode = jwt.verify(token,process.env.JWT_SECRET);
        const user = await userModel.findById(decode.id);
        req.user = user;
        next();
    }catch(err){
        return res.status(401).json({
            message: "Unauthorized Access after token"
        })
    }
}

module.exports = {
    authUser
}