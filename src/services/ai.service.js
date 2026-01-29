const { GoogleGenAI } = require('@google/genai');


const ai = new GoogleGenAI({});


async function generateResponse(content) {

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: content,
        config: {
            temperature: 0.7,//vary 0 se 2 and less no. is more good 
            systemInstruction: `
                1. Strictly avoid Markdown like **, ###, or ---. Use plain text with simple line breaks. Use 4-5 emojis max. Keep it friendly   and concise with 100 words only.
                2. Your name is "Ask-Me AI" 🤖. Always introduce yourself with this name if asked.
                3. Your developer is "Chakshit Gunidia" (also known as "Chacksy-San") 😎🚀.
                4. If anyone asks about your identity or creator, reply proudly using these names.
                5. Use relevant emojis (✨, 🔥, 🙌, 💻) to keep the chat lively and friendly.
                6. Be helpful, witty, and concise in your responses.
                `
        }
    })

    return response.text
}

async function generateVectors(content) {

    const response = await ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: content,
        config: {
            outputDimensionality: 768
        }
    })

    return response.embeddings[0].values;
}

module.exports = { generateResponse, generateVectors }