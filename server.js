const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 1. Health-check Route (Server ko zinda rakhne ke liye)
app.get('/', (req, res) => {
    res.status(200).send("Server is awake and running!");
});

// 2. Main AI Chat Route
app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;
    const personaInstruction = req.body.persona;

    // Render Logs mein message dekhne ke liye (CCTV Camera)
    console.log("--- Naya Message Aaya ---");
    console.log("User:", userMessage);

    const API_KEY = process.env.GEMINI_API_KEY; 
    
    // Sahi Model Name: gemini-1.5-flash
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: personaInstruction }] },
                contents: [{ parts: [{ text: userMessage }] }]
            })
        });

        const data = await response.json();

        // Agar Google koi error bhejega toh wo yahan dikhega
        if (data.error) {
            console.error("Google API Error:", data.error.message);
        } else {
            console.log("AI ka Jawab: (Success)");
        }

        res.json(data); 

    } catch (error) {
        console.error("Backend Catch Error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// 3. Port Configuration (Cloud/Render ke liye zaroori)
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`SG AI Backend active on port ${PORT}`);
});
