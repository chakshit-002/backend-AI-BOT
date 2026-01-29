const mongoose = require('mongoose');

async function connectDB(){
    try{
       await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected Successfully with DB")
    }
    catch(err){
        console.log("Connection Failed with DB")
    }
}


module.exports = connectDB;