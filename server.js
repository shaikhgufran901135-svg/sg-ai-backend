const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
// 🚀 Limit badha di taaki heavy Base64 image/video easily transfer ho sake
app.use(express.json({ limit: '50mb' })); 

// ==========================================
// 🚀 1. PURANA LOGIC: MAIN CHAT SYSTEM (Do Not Touch)
// ==========================================
app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;
    const personaInstruction = req.body.persona;
    const chatHistory = req.body.history || [];

    const API_KEY = process.env.GROQ_API_KEY; 

    // Groq Audio (Old Chat based)
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
// 🚀 2. NAYA LOGIC: HUGGING FACE TOOLS API
// ==========================================

// ✅ 2.1 - AI Image Generator
app.post('/api/generate-image', async (req, res) => {
    const { message } = req.body;
    const HF_TOKEN = process.env.HF_TOKEN; // Render me HF_TOKEN add karna mat bhoolna!

    console.log(`🎨 Image Gen Request: ${message}`);

    try {
        const response = await fetch("https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0", {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${HF_TOKEN}`, 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({ inputs: message }),
        });

        if (!response.ok) throw new Error("Hugging Face API se image nahi ban payi.");

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = buffer.toString('base64');
        const mediaUrl = `data:image/png;base64,${base64Image}`;

        res.json({ success: true, mediaUrl: mediaUrl });
    } catch (error) {
        console.error("Image Gen Error:", error);
        res.status(500).json({ success: false, error: "Image generation failed." });
    }
});


// ✅ 2.2 - AI Video Generator (2 Tokens wala model)
app.post('/api/generate-video', async (req, res) => {
    const { message } = req.body;
    const HF_TOKEN = process.env.HF_TOKEN;

    console.log(`🎥 Video Gen Request: ${message}`);

    try {
        const response = await fetch("https://api-inference.huggingface.co/models/cerspense/zeroscope_v2_576w", {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${HF_TOKEN}`, 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({ inputs: message }),
        });

        if (!response.ok) throw new Error("Hugging Face API se video nahi ban paya (Server overload ho sakta hai).");

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Video = buffer.toString('base64');
        const mediaUrl = `data:video/mp4;base64,${base64Video}`;

        res.json({ success: true, mediaUrl: mediaUrl });
    } catch (error) {
        console.error("Video Gen Error:", error);
        res.status(500).json({ success: false, error: "Video generation failed or timed out." });
    }
});


// ✅ 2.3 - AI Text to Voice (Smart Hindi/English routing)
app.post('/api/generate-audio', async (req, res) => {
    const { message } = req.body;
    const HF_TOKEN = process.env.HF_TOKEN;

    // 💡 Smart Detector: Check agar text me Hindi (Devanagari) font hai
    const isHindi = /[\u0900-\u097F]/.test(message);
    const hfModel = isHindi ? "facebook/mms-tts-hin" : "facebook/mms-tts-eng";

    console.log(`🎙️ Audio Gen Request: ${message} (Using model: ${hfModel})`);

    try {
        const response = await fetch(`https://api-inference.huggingface.co/models/${hfModel}`, {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${HF_TOKEN}`, 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({ inputs: message }),
        });

        if (!response.ok) throw new Error("Audio generation model abhi load ho raha hai.");

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Audio = buffer.toString('base64');
        const mediaUrl = `data:audio/wav;base64,${base64Audio}`;

        res.json({ success: true, mediaUrl: mediaUrl });
    } catch (error) {
        console.error("Audio Gen Error:", error);
        res.status(500).json({ success: false, error: "Audio generation failed." });
    }
});


// ✅ 2.4 - Video Summary (Using Groq text model)
app.post('/api/video-summary', async (req, res) => {
    const { message } = req.body; // Yahan URL ya text aayega
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
    console.log(`SG AI Backend chal raha hai port ${PORT} par! (Powered by Groq & HF 🚀)`);
});
