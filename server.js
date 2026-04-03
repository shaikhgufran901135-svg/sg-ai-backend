const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Health-check (Server ko jagaye rakhne ke liye)
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
                // 👇👇 FIXED: Google v1 expects system_instruction (with underscore)
                system_instruction: { parts: [{ text: personaInstruction }] },
                contents: [{ parts: [{ text: userMessage }] }]
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error("Google API Error:", data.error.message);
            res.status(400).json(data); // Google ka asli error frontend ko bhejo check karne ke liye
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
