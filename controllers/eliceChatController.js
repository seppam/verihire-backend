const axios = require('axios');
const catchAsync = require("../utils/catchAsync"); 

exports.getChatResponse = catchAsync(async (req, res, next) => {
    const { message } = req.body;
    const lang = req.headers['accept-language'] === 'id' ? 'id' : 'en';

    // Validasi input kosong
    const errMsg = lang === 'id' ? 'Pesan tidak boleh kosong.' : 'Message cannot be empty.';
    if (!message) {
        return res.status(400).json({ success: false, message: errMsg });
    }

    const systemInstruction = `
        You are 'Career Buddy', an expert Recruitment Security Assistant created by VeriHire.
        Language to use: ${lang === 'id' ? 'Indonesian' : 'English'}.
        
        CORE MISSION: 
        Help users identify job scams, provide safe job-hunting tips, and offer career advice.

        BEHAVIOR RULES:
        1. Stateless Awareness: Assume each user message is a standalone question. Provide complete, self-contained answers without relying on past conversation.
        2. Strict Boundaries: If the user asks about topics completely unrelated to careers, jobs, CVs, or recruitment scams (e.g., cooking, politics, math), politely decline and offer to help with job-related questions instead.
        3. Tone: Professional, empathetic, and encouraging. Use bullet points for readability when listing tips.
        4. Practicality: When giving anti-scam advice, always include actionable steps (e.g., "Always check the company's official domain" or "Never transfer money for a job").
    `;

    try {
        const url = "https://mlapi.run/daef5150-72ef-48ff-8861-df80052ea7ac/v1/chat/completions";
        
        const payload = {
            model: "openai/gpt-5-nano",
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: message }
            ],
            // Temperature diset ke 0.7 agar respon chat lebih luwes, natural, dan nggak kaku
            // temperature: 0.7, 
            response_format: { type: "text" }
        };

        const headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "Authorization": `Bearer ${process.env.ELICE_API_KEY}` // Tetap pakai kunci yang sama
        };

        // Tembak API Elice
        const response = await axios.post(url, payload, { headers });
        
        // Ambil isi teks jawabannya
        const replyText = response.data.choices[0].message.content;

        res.status(200).json({ 
            success: true, 
            reply: replyText 
        });

    } catch (error) {
        console.error("Elice Chat API Error:", error.response ? error.response.data : error.message);
        const errorResponseMsg = lang === 'id' ? 'Gagal mendapatkan respon dari AI.' : 'Failed to get AI response.';
        
        return res.status(500).json({ 
            success: false, 
            message: errorResponseMsg 
        });
    }
});