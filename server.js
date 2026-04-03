const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Server ko jagaye rakhne ka rasta
app.get('/', (req, res) => {
    res.status(200).send("Server is awake and running!");
});

app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;
    const personaInstruction = req.body.persona;

    console.log("--- Naya Message Aaya ---");
    console.log("User:", userMessage);

    const API_KEY = process.env.GEMINI_API_KEY; 
    
    // Stable v1 API link
    const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                // 👇👇 BRAHMASTRA: Humne dono messages ko ek sath jod diya! 👇👇
                contents: [{ 
                    parts: [{ 
                        text: `System Instruction (Follow this strictly): ${personaInstruction}\n\nUser Message: ${userMessage}` 
                    }] 
                }]
                // 👆👆 Ab Google ko koi error nikalne ka mauka hi nahi milega! 👆👆
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error("Google API Error:", data.error.message);
            res.status(400).json(data);
        } else {
            console.log("AI ka Jawab: Success! ✅");
            res.json(data);
        }

    } catch (error) {
        console.error("Backend Catch Error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`SG AI Backend active on port ${PORT}`);
});
