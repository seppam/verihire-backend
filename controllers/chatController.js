const { GoogleGenerativeAI } = require("@google/generative-ai");
const catchAsync = require("../utils/catchAsync"); 
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.getChatResponse = catchAsync(async (req, res) => {
    const { message } = req.body;
    const lang = req.headers['accept-language'] === 'id' ? 'id' : 'en';

    if (!message) {
        const errorMsg = lang === 'id' ? "Pesan tidak boleh kosong." : "Message cannot be empty.";
        return res.status(400).json({ success: false, message: errorMsg });
    }

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash-lite",
        systemInstruction: `
            You are 'Career Buddy', a recruitment security expert. 
            Language: ${lang === 'id' ? 'Indonesian' : 'English'}.
            Focus: Job scams, safe job searching, and career advice.
            Restriction: If asked about non-career topics, politely decline and steer back to job safety.
        `,
    });

    const result = await model.generateContent(message);
    res.status(200).json({ success: true, reply: (await result.response).text() });
});