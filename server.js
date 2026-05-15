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

    // ==========================================
    // 🚀 NEW: AUDIO GENERATION LOGIC (Groq TTS)
    // ==========================================
    // Agar Persona 'audio-gen' ya 'Voice Maker' type ka hai, toh Groq ke Audio model ko call lagao
    if (personaInstruction && (personaInstruction.includes("audio-gen") || personaInstruction.includes("Text to Voice") || personaInstruction.includes("Voice Maker"))) {
        console.log("🎙️ Audio Generation Requested using Groq Orpheus!");

        const AUDIO_API_URL = `https://api.groq.com/openai/v1/audio/speech`;

        try {
            // Note: History skip karke sirf current message bhej rahe hain taaki pure conversation ka audio na banne lag jaye
            const response = await fetch(AUDIO_API_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                    model: "canopylabs/orpheus-v1-english",
                    input: userMessage, // Jo text user ne type kiya
                    voice: "hannah", // Options: autumn, diana, hannah, austin, daniel, troy (Tum ise change bhi kar sakte ho)
                    response_format: "wav"
                }),
            });

            if (!response.ok) {
                const errData = await response.text();
                throw new Error(`Groq Audio API Error: ${errData}`);
            }

            // Audio binary file ki tarah aayega (ArrayBuffer)
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            // Binary audio ko Base64 String mein convert kar rahe hain taaki HTML mein bhej sakein
            const base64Audio = buffer.toString('base64');
            const audioSrc = `data:audio/wav;base64,${base64Audio}`;

            // HTML ka Audio player direct banakar bhej denge, frontend apne aap render kar lega
            const finalReply = `🎵 Your audio is ready!<br><br><audio controls src="${audioSrc}" style="width: 100%; border-radius: 10px; margin-top: 10px;"></audio>`;

            // Gemini ke fake format mein wrap karke bhej do
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


    // ==========================================
    // 🚀 EXISTING TEXT CHAT LOGIC (Groq Text API)
    // ==========================================
    
    const API_URL = `https://api.groq.com/openai/v1/chat/completions`;

    // 🚀 Models Routing (Tumhari requirement ke hisaab se)
    let aiModel = "llama-3.1-8b-instant"; // Default fast model (General, Bestie, Motivator)

    // 1. Agar persona mein SIRF coding (expert programmer) ka zikr hai, toh Llama 4 Scout lagao
    if (personaInstruction && personaInstruction.includes("expert programmer")) {
        aiModel = "meta-llama/llama-4-scout-17b-16e-instruct"; 
        console.log("🔥 Llama 4 Scout Activated for Code Helper!");
        
    // 2. Agar persona mein Teacher ya Funny Bot ka zikr hai, toh 70B Versatile lagao
    } else if (personaInstruction && (personaInstruction.includes("encouraging teacher") || personaInstruction.includes("stand-up comedian"))) {
        aiModel = "llama-3.3-70b-versatile"; 
        console.log("🧠 Smart Llama 70B Activated for Teacher & Funny Bot!");

    // 3. Agar persona mein shayari ya poetic AI ka zikr hai, toh OpenAI model select karo
    } else if (personaInstruction && (personaInstruction.includes("poetic AI") || personaInstruction.includes("Shayari"))) {
        aiModel = "openai/gpt-oss-120b"; 
        console.log("✨ Premium OpenAI 120B Activated for Shayari!");
        
    // 4. Baaki sabhi mode ke liye default fast model chalega
    } else {
        console.log("⚡ Fast Llama Model (8B) Activated for Normal Chat!");
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
