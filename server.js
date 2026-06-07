const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
// 🚀 Limit badha di taaki heavy Base64 image/video easily transfer ho sake
app.use(express.json({ limit: '50mb' })); 

// ==========================================
// 🚀 NEW: GEMINI VISION API HELPER FUNCTION
// ==========================================
async function askGeminiVision(prompt, base64Image) {
    const apiKey = process.env.GEMINI_API_KEY; 
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing in backend.");

    // 1. 🚀 CHANGE: URL updated to latest gemini-2.5-flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // Base64 string se MimeType aur Data alag karna (eg: data:image/jpeg;base64,.....)
    const matches = base64Image.match(/^data:(image\/\w+);base64,(.+)$/);
    let mimeType = "image/jpeg";
    let base64Data = base64Image;

    if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Data = matches[2];
    }

    const payload = {
        contents: [{
            parts: [
                { text: prompt },
                {
                    inline_data: {
                        mime_type: mimeType,
                        data: base64Data
                    }
                }
            ]
        }]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (data.candidates && data.candidates.length > 0) {
        return data.candidates[0].content.parts[0].text;
    } else {
        console.error("Gemini API Error details:", JSON.stringify(data, null, 2));
        throw new Error("Gemini API se sahi jawab nahi aaya.");
    }
}


// ==========================================
// 🚀 1. MAIN CHAT SYSTEM & AUDIO
// ==========================================
app.post('/api/chat', async (req, res) => {
    const userMessage = req.body.message;
    const personaInstruction = req.body.persona;
    const chatHistory = req.body.history || [];
    const imageData = req.body.image_data; // Frontend se aane wali image

    // 🔥 Agar Image aayi hai toh seedha Gemini Vision ko handle karne do
    if (imageData) {
        console.log("👁️ Gemini Vision Activated for Chat!");
        try {
            const promptText = userMessage || "Describe this image in detail.";
            const geminiReply = await askGeminiVision(promptText, imageData);
            
            // Frontend ko wahi structure chahiye jo Groq deta tha
            return res.json({
                candidates: [
                    { content: { parts: [{ text: geminiReply }] } }
                ]
            });
        } catch (error) {
            console.error("Gemini Vision Error:", error);
            return res.status(500).json({ error: "Image process karne mein error aaya." });
        }
    }

    // ==========================================
    // Groq Text & Audio Logic (Agar image nahi hai)
    // ==========================================
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

// ✅ 2.1 - AI Image Generator (Hugging Face FLUX.1 + Gemini Prompt Enhancer)
app.post('/api/generate-image', async (req, res) => {
    const { message, image_data } = req.body;
    let finalPrompt = message || "A breathtaking beautiful futuristic artwork";

    try {
        // 🧠 Master Prompt: Smart Image-to-Image Logic Intact
        if (image_data) {
            console.log(`👁️ Gemini Vision Activated for Image Prompt Enhancement!`);
            
            const geminiInstruction = `Analyze this uploaded image. The user wants to generate a new AI image based on it. User's specific instruction is: '${message || 'make it better'}'. Please write a highly detailed, descriptive image-generation prompt (in English) that can be fed into an AI generator to create this new image. ONLY output the prompt, no conversational text.`;
            
            finalPrompt = await askGeminiVision(geminiInstruction, image_data);
            console.log(`✨ Enhanced Prompt by Gemini: ${finalPrompt}`);
        }

        console.log(`🎨 Image Gen Request (FLUX.1): ${finalPrompt}`);

        // 🔑 Token Authentication
        const hfToken = process.env.HF_TOKEN; 
        if (!hfToken) throw new Error("HF_TOKEN is missing in backend.");

        // 🚀 Hugging Face FLUX.1 API Integration
        const hfUrl = "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell";

        const response = await fetch(hfUrl, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${hfToken}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ inputs: finalPrompt })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Hugging Face API Error:", errText);
            throw new Error("Hugging Face API se image nahi ban payi.");
        }

        // ⚡ Fast Base64 Image Delivery (ArrayBuffer to Base64)
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = buffer.toString('base64');
        
        // Directly prep the string for your frontend
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

    res.status(400).json({ 
        success: false, 
        error: "🎥 AI Video Generation is a Premium Feature and will be available soon!" 
    });
});


// ✅ 2.3 - AI Text to Voice (🔥 FAST GROQ MODEL IMPLEMENTED 🔥)
app.post('/api/generate-audio', async (req, res) => {
    const { message } = req.body;
    const API_KEY = process.env.GROQ_API_KEY; 

    console.log(`🎙️ Audio Gen Request: ${message} (Using Groq)`);

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
                input: message || "Please enter some text.",
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
    // 🗑️ Log updated to remove Imagen 3 mention
    console.log(`SG AI Backend chal raha hai port ${PORT} par! (Powered by Groq, Gemini 2.5 Flash & FLUX.1 🚀)`);
});
