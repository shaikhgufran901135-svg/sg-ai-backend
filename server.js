const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
// 🚀 Limit badha di taaki heavy Base64 image/video easily transfer ho sake
app.use(express.json({ limit: '50mb' })); 

// ==========================================
// 🚀 1. MAIN CHAT SYSTEM & AUDIO (Groq)
// ==========================================
app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;
    const personaInstruction = req.body.persona;
    const chatHistory = req.body.history || [];

    const API_KEY = process.env.GROQ_API_KEY; 

    // Groq Audio (Old Chat based fallback)
    if (personaInstruction === "Text to Voice") {
        console.log("🎙️ Groq Audio Generation Requested (From Chat)!");
        const AUDIO_API_URL = `https://api.groq.com/openai/v1/audio/speech`;
        try {
            const response = await fetch(AUDIO_API_URL, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({
                    model: "canopylabs/orpheus-v1-english",
                    input: userMessage,
                    voice: "hannah",
                    response_format: "wav"
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Groq Audio API Error: ${errText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64Audio = buffer.toString('base64');
            const audioSrc = `data:audio/wav;base64,${base64Audio}`;

            const finalReply = `🎵 Your audio is ready!<br><br><audio controls src="${audioSrc}" style="width: 100%; border-radius: 10px; margin-top: 10px;"></audio>`;

            const fakeGeminiFormat = {
                candidates: [
                    { content: { parts: [{ text: finalReply }] } }
                ]
            };
            return res.json(fakeGeminiFormat);
        } catch (error) {
            console.error("Audio Generation Error:", error);
            return res.status(500).json({ error: "Audio generate karne mein error aaya." });
        }
    }

    // Groq Text Chat
    const API_URL = `https://api.groq.com/openai/v1/chat/completions`;
    let aiModel = "llama-3.1-8b-instant"; 

    if (personaInstruction && personaInstruction.includes("expert programmer")) {
        aiModel = "meta-llama/llama-4-scout-17b-16e-instruct"; 
        console.log("🔥 Llama 4 Scout Activated for Code Helper!");
    } else if (personaInstruction && (personaInstruction.includes("encouraging teacher") || personaInstruction.includes("stand-up comedian"))) {
        aiModel = "llama-3.3-70b-versatile"; 
        console.log("🧠 Smart Llama 70B Activated for Teacher & Funny Bot!");
    } else if (personaInstruction && (personaInstruction.includes("poetic AI") || personaInstruction.includes("Shayari"))) {
        aiModel = "openai/gpt-oss-120b"; 
        console.log("✨ Premium OpenAI 120B Activated for Shayari!");
    } else {
        console.log("⚡ Fast Llama Model (8B) Activated for Normal Chat!");
    }

    let formattedMessages = [
        { role: "system", content: personaInstruction || "You are a helpful AI assistant." }
    ];

    if (chatHistory.length > 0) {
        chatHistory.forEach(msg => {
            const mappedRole = msg.role === "model" ? "assistant" : "user";
            formattedMessages.push({ role: mappedRole, content: msg.parts[0].text });
        });
    } else {
        formattedMessages.push({ role: "user", content: userMessage });
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
                messages: formattedMessages
            })
        });

        const data = await response.json();

        if (data.choices && data.choices.length > 0) {
            const aiReply = data.choices[0].message.content;
            const fakeGeminiFormat = {
                candidates: [
                    { content: { parts: [{ text: aiReply }] } }
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


// ==========================================
// 🚀 2. TOOLS API (IMAGE, VIDEO, AUDIO, SUMMARY)
// ==========================================

// ✅ 2.1 - AI Image Generator (🔥 POLLINATIONS AI - 100% Free)
app.post('/api/generate-image', async (req, res) => {
    const { message } = req.body;

    console.log(`🎨 Image Gen Request (Pollinations): ${message}`);

    try {
        // Pollinations AI bina kisi token ke directly prompt se image banata hai
        const encodedPrompt = encodeURIComponent(message);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;

        const response = await fetch(imageUrl);

        if (!response.ok) throw new Error("Image API fail ho gayi.");

        // Frontend ko image show karne ke liye usko Base64 me convert kar rahe hain
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = buffer.toString('base64');
        const mediaUrl = `data:image/jpeg;base64,${base64Image}`;

        res.json({ success: true, mediaUrl: mediaUrl });
    } catch (error) {
        console.error("Image Gen Error:", error.message);
        res.status(500).json({ success: false, error: "Image generation failed." });
    }
});


// ✅ 2.2 - AI Video Generator (⚠️ PREMIUM POPUP LOGIC - Backend Message)
app.post('/api/generate-video', async (req, res) => {
    const { message } = req.body;

    console.log(`🎥 Video Gen Request Blocked: ${message}`);

    // 🔥 Ye line direct tumhare frontend ko ek "Error" treat hogi aur ye custom message screen pe dikhega
    res.status(400).json({ 
        success: false, 
        error: "🎥 AI Video Generation is a Premium Feature and will be available soon!" 
    });
});


// ✅ 2.3 - AI Text to Voice (🔥 FAST GROQ MODEL IMPLEMENTED 🔥)
app.post('/api/generate-audio', async (req, res) => {
    const { message } = req.body;
    const API_KEY = process.env.GROQ_API_KEY; 

    console.log(`🎙️ Audio Gen Request: ${message} (Using Groq: canopylabs/orpheus-v1-english)`);

    const AUDIO_API_URL = `https://api.groq.com/openai/v1/audio/speech`;

    try {
        const response = await fetch(AUDIO_API_URL, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                model: "canopylabs/orpheus-v1-english",
                input: message,
                voice: "hannah",
                response_format: "wav"
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Groq Audio API Error: ${errText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Audio = buffer.toString('base64');
        const mediaUrl = `data:audio/wav;base64,${base64Audio}`;

        res.json({ success: true, mediaUrl: mediaUrl });
    } catch (error) {
        console.error("Audio Gen Error:", error.message);
        res.status(500).json({ success: false, error: "Audio generation failed." });
    }
});


// ✅ 2.4 - Video Summary (Using Groq text model)
app.post('/api/video-summary', async (req, res) => {
    const { message } = req.body; 
    const API_KEY = process.env.GROQ_API_KEY; 

    console.log(`📺 Video Summary Request: ${message}`);

    try {
        const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant", 
                messages: [
                    { role: "system", content: "You are a helpful AI that summarizes video content or topics provided by the user. Give a clear, point-by-point summary." },
                    { role: "user", content: `Please provide a summary for this video topic/link: ${message}` }
                ]
            })
        });

        const data = await response.json();
        
        if (data.choices && data.choices.length > 0) {
            res.json({ success: true, reply: data.choices[0].message.content }); 
        } else {
            throw new Error("Summary generate nahi ho payi.");
        }
    } catch (error) {
        console.error("Summary Gen Error:", error);
        res.status(500).json({ success: false, error: "Video summary failed." });
    }
});


// ==========================================
// 🚀 SERVER START
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`SG AI Backend chal raha hai port ${PORT} par! (Powered by Groq & Pollinations AI 🚀)`);
});
