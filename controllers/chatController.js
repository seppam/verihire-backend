const { GoogleGenerativeAI } = require("@google/generative-ai");
const catchAsync = require("../utils/catchAsync"); 
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const Chat = require("../models/Chat");

exports.getChatHistory = catchAsync(async (req, res, next) => {
    const chat = await Chat.findOne({ userId: req.user._id });
    res.status(200).json({
        success: true,
        history: chat ? chat.messages : []
    });
});

exports.getChatResponse = catchAsync(async (req, res) => {
    const { message } = req.body;
    const lang = req.headers['accept-language'] === 'id' ? 'id' : 'en';

    if (!message) {
        const errMsg = lang === 'id' ? 'Pesan tidak boleh kosong.' : 'Message cannot be empty.';
        return res.status(400).json({ success: false, message: errMsg });
    }

    const systemInstruction = `
        You are 'Career Buddy', an expert Recruitment Security Assistant created by VeriHire.
        Language to use: ${lang === 'id' ? 'Indonesian' : 'English'}.
        
        CORE MISSION: 
        Help users identify job scams, provide safe job-hunting tips, and offer career advice.

        BEHAVIOR RULES:
        1. Context Awareness: You are talking to a user. Use the conversation history provided to maintain context.
        2. Strict Boundaries: If the user asks about topics completely unrelated to careers, jobs, CVs, or recruitment scams (e.g., cooking, politics, math), politely decline and offer to help with job-related questions instead.
        3. Tone: Professional, empathetic, and encouraging. Use bullet points for readability when listing tips.
        4. Practicality: When giving anti-scam advice, always include actionable steps (e.g., "Always check the company's official domain" or "Never transfer money for a job").
    `;

    // HISTORY LOGIC (Synchronized with Elice)
    let chatContext = [];
    if (req.user) {
        let chat = await Chat.findOne({ userId: req.user._id });
        if (!chat) chat = await Chat.create({ userId: req.user._id, messages: [] });

        chat.messages.push({ role: 'user', content: message });
        const lastMessages = chat.messages.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        chatContext = [
            { role: "system", content: systemInstruction },
            ...lastMessages
        ];
        req.chatDoc = chat;
    } else {
        chatContext = [
            { role: "system", content: systemInstruction.replace("Context Awareness", "Stateless Awareness: Assume each user message is a standalone question.") },
            { role: "user", content: message }
        ];
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    
    // Gemini handles history via contents array in startChat or generateContent
    // For simplicity and direct parity with Elice's message array:
    const result = await model.generateContent({
        contents: chatContext.map(m => ({
            role: m.role === 'assistant' ? 'model' : m.role,
            parts: [{ text: m.content }]
        }))
    });

    const replyText = result.response.text();

    if (req.user && req.chatDoc) {
        req.chatDoc.messages.push({ role: 'assistant', content: replyText });
        await req.chatDoc.save();
    }

    res.status(200).json({ success: true, reply: replyText });
});