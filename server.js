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
    const API_KEY = process.env.GEMINI_API_KEY; 
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

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
        res.json(data); 

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// 👇👇 YAHAN NAYA CODE ADD KIYA HAI 👇👇
// Server ko zinda rakhne ke liye ek simple health-check route
app.get('/', (req, res) => {
    res.status(200).send("Server is awake and running!");
});
// 👆👆 NAYA CODE YAHAN KHATAM 👆👆

// Port set karna cloud ke liye
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`SG AI Backend chal raha hai port ${PORT} par!`);
});
