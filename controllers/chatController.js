const { GoogleGenerativeAI } = require("@google/generative-ai");
const catchAsync = require("../utils/catchAsync"); 
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.getChatResponse = catchAsync(async (req, res) => {
    const { message } = req.body;
    const lang = req.headers['accept-language'] === 'id' ? 'id' : 'en';

    const errMsg = lang === 'id' ? 'Pesan tidak boleh kosong.' : 'Message cannot be empty.';
    if (!message) {
        return res.status(400).json({ success: false, message: errMsg });
    }

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash-lite",
        systemInstruction: `
            You are 'Career Buddy', an expert Recruitment Security Assistant created by VeriHire.
            Language to use: ${lang === 'id' ? 'Indonesian' : 'English'}.
            
            CORE MISSION: 
            Help users identify job scams, provide safe job-hunting tips, and offer career advice.

            BEHAVIOR RULES:
            1. Stateless Awareness: Assume each user message is a standalone question. Provide complete, self-contained answers without relying on past conversation.
            2. Strict Boundaries: If the user asks about topics completely unrelated to careers, jobs, CVs, or recruitment scams (e.g., cooking, politics, math), politely decline and offer to help with job-related questions instead.
            3. Tone: Professional, empathetic, and encouraging. Use bullet points for readability when listing tips.
            4. Practicality: When giving anti-scam advice, always include actionable steps (e.g., "Always check the company's official domain" or "Never transfer money for a job").
        `,
    });

    const result = await model.generateContent(message);
    res.status(200).json({ success: true, reply: (await result.response).text() });
});