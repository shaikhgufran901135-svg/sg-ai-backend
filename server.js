const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Jab frontend se message aayega
app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;
    const personaInstruction = req.body.persona;
    const chatHistory = req.body.history || []; // 🚀 Frontend se bheji hui history yahan aayegi

    // API Key environment variables se aayegi (Taki koi chura na sake)
    // DHYAN DEIN: Render par variable ka naam GROQ_API_KEY rakhna hai
    const API_KEY = process.env.GROQ_API_KEY; 
    const API_URL = `https://api.groq.com/openai/v1/chat/completions`;

    // 🚀 NAYA LOGIC: 3 Models Routing (Automatic switch)
    let aiModel = "llama-3.1-8b-instant"; // 1st Model: Default chhota aur fast model

    // Agar persona mein coding ya teacher ka zikr hai, toh bada Llama model select karo
    if (personaInstruction && (personaInstruction.includes("coding expert") || personaInstruction.includes("patient teacher"))) {
        aiModel = "llama-3.3-70b-versatile"; // 2nd Model: Smart model for complex tasks
        console.log("🔥 Smart Llama Model (70B) Activated for Coding/Teaching!");
        
    // Agar persona mein shayari ya poetic AI ka zikr hai, toh OpenAI model select karo
    } else if (personaInstruction && (personaInstruction.includes("poetic AI") || personaInstruction.includes("Shayari"))) {
        aiModel = "openai/gpt-oss-120b"; // 3rd Model: Premium OpenAI 120B model for Shayari
        console.log("✨ Premium OpenAI 120B Activated for Shayari!");
        
    // Baaki sabhi mode (General, Friendly, Funny, Motivator) ke liye fast model
    } else {
        console.log("⚡ Fast Llama Model (8B) Activated for Normal/Friendly Chat!");
    }

    // 🚀 FIX: History Mapping - Gemini format se Groq format me convert kar rahe hain
    let formattedMessages = [
        {
            // Aapki Persona/System Instruction
            role: "system",
            content: personaInstruction || "You are a helpful AI assistant."
        }
    ];

    if (chatHistory.length > 0) {
        // Agar pehle se baat chal rahi hai, toh saari purani history add karo
        chatHistory.forEach(msg => {
            // Frontend 'model' use karta hai, Groq usko 'assistant' samajhta hai
            const mappedRole = msg.role === "model" ? "assistant" : "user";
            formattedMessages.push({
                role: mappedRole,
                content: msg.parts[0].text
            });
        });
    } else {
        // Agar history khali hai, toh bas naya message add kar do (Failsafe)
        formattedMessages.push({
            role: "user",
            content: userMessage
        });
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                model: aiModel, 
                messages: formattedMessages // 🚀 Yahan ab naye message ke sath PURI history pass hogi!
            })
        });

        const data = await response.json();

        // 🪄 MAGIC TRICK: Groq ke jawab ko Gemini ke format mein convert kar rahe hain
        // Taaki Android Studio ka code badalna na pade!
        if (data.choices && data.choices.length > 0) {
            const aiReply = data.choices[0].message.content;
            
            const fakeGeminiFormat = {
                candidates: [
                    {
                        content: {
                            parts: [{ text: aiReply }]
                        }
                    }
                ]
            };

            res.json(fakeGeminiFormat); 
        } else {
            console.error("Groq API Error:", data);
            res.status(500).json({ error: "Groq se sahi jawab nahi aaya" });
        }

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Port set karna cloud ke liye
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`SG AI Backend chal raha hai port ${PORT} par! (Powered by Groq 🚀)`);
});
