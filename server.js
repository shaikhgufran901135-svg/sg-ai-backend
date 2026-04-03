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

    // .trim() lagaya hai taaki agar key copy karte waqt koi space aa gaya ho toh wo hat jaye
    const API_KEY = (process.env.GEMINI_API_KEY || "").trim(); 
    
    // 👇 OFFICIAL STABLE V1 ENDPOINT (Yahan model pakka milega) 👇
    const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                // Yahan koi extra field nahi hai, Google reject nahi kar sakta
                contents: [{ 
                    parts: [{ 
                        text: `Persona: ${personaInstruction}\n\nUser: ${userMessage}` 
                    }] 
                }]
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
        console.error("Backend Error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`SG AI Backend active on port ${PORT}`);
});
