const axios = require('axios');
const catchAsync = require("../utils/catchAsync");
const Chat = require("../models/Chat");

exports.getChatHistory = catchAsync(async (req, res, next) => {
    const chat = await Chat.findOne({ userId: req.user._id });

    res.status(200).json({
        success: true,
        history: chat ? chat.messages : []
    });
});

exports.getChatResponse = catchAsync(async (req, res, next) => {
    const { message } = req.body;
    const lang = req.headers['accept-language'] === 'id' ? 'id' : 'en';

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
        1. Context Awareness: You are talking to a user. Use the conversation history provided to maintain context.
        2. Strict Boundaries: If the user asks about topics completely unrelated to careers, jobs, CVs, or recruitment scams (e.g., cooking, politics, math), politely decline and offer to help with job-related questions instead.
        3. Tone: Professional, empathetic, and encouraging. Use bullet points for readability when listing tips.
        4. Practicality: When giving anti-scam advice, always include actionable steps (e.g., "Always check the company's official domain" or "Never transfer money for a job").
    `;

    let chatContext = [];
    let chatDoc = null;

    // Load or create chat doc first (do NOT save user message yet)
    if (req.user) {
        chatDoc = await Chat.findOne({ userId: req.user._id });
        if (!chatDoc) {
            chatDoc = await Chat.create({ userId: req.user._id, messages: [] });
        }

        const lastMessages = chatDoc.messages.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        chatContext = [
            { role: "system", content: systemInstruction },
            ...lastMessages,
            { role: "user", content: message }
        ];
    } else {
        chatContext = [
            { role: "system", content: systemInstruction.replace("Context Awareness", "Stateless Awareness: Assume each message is a standalone question.") },
            { role: "user", content: message }
        ];
    }

    const payload = {
        model: "openai/gpt-5-nano",
        messages: chatContext,
        response_format: { type: "text" }
    };

    const headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "Authorization": `Bearer ${process.env.ELICE_API_KEY}`
    };

    const response = await axios.post(
        "https://mlapi.run/daef5150-72ef-48ff-8861-df80052ea7ac/v1/chat/completions",
        payload,
        { headers, timeout: 30000 }
    );

    const replyText = response.data.choices[0].message.content;

    // Save to DB ONLY after getting AI reply (prevents orphan messages)
    if (chatDoc) {
        chatDoc.messages.push({ role: 'user', content: message });
        chatDoc.messages.push({ role: 'assistant', content: replyText });
        await chatDoc.save();
    }

    res.status(200).json({
        success: true,
        reply: replyText
    });
});
