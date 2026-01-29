const { Pinecone } = require("@pinecone-database/pinecone");

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY })

const askMeChatAIIndex = pc.Index("ask-me");

async function createMemory({ vectors, metadata, messageId }) {
    await askMeChatAIIndex.upsert([{
        id: messageId,
        values: vectors,
        metadata
    }])
}

async function queryMemory({ queryVector, limit, metadata }) {

    const data = await askMeChatAIIndex.query({
        vector: queryVector,
        topK: limit,
        // filter: metadata ? {metadata} : undefined,
        filter: metadata ? metadata : undefined,
        includeMetadata: true
    })

    return data.matches
}

// services/vector.service.js
async function deleteByIDs(idsArray) {
    try {
        // IDs se delete karne mein 'Illegal Condition' error kabhi nahi aayega
        // Kyunki IDs hamesha indexed hoti hain
        await askMeChatAIIndex.deleteMany(idsArray);
    } catch (err) {
        console.error("Pinecone ID Delete Error:", err.message);
        throw err;
    }
}



module.exports = { createMemory, queryMemory, deleteByIDs }