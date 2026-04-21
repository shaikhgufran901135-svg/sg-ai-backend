const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Jab frontend se message aayega
app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;
    const personaInstruction = req.body.persona;

    // API Key environment variables se aayegi (Taki koi chura na sake)
    // DHYAN DEIN: Render par variable ka naam GROQ_API_KEY rakhna hai
    const API_KEY = process.env.GROQ_API_KEY; 
    const API_URL = `https://api.groq.com/openai/v1/chat/completions`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                model: "llama3-8b-8192", // Groq ka superfast model
                messages: [
                    {
                        // Aapki Persona/System Instruction
                        role: "system",
                        content: personaInstruction || "You are a helpful AI assistant."
                    },
                    {
                        // User ka bheja hua sawal
                        role: "user",
                        content: userMessage
                    }
                ]
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
