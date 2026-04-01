const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const analyzeCvWithAI = async (cvText, jobTarget, lang = 'en') => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        
        const prompt = `
            You are an Expert Applicant Tracking System (ATS) and Senior Recruiter.
            Analyze the following CV text.
            
            Target Job Title / Requirements: "${jobTarget || 'General Professional Setup'}"
            
            CV TEXT:
            "${cvText}"

            TASKS:
            1. Calculate an ATS match score (0-100) based on how well the CV fits the Target Job.
            2. Determine the match status (Low, Medium, High, Excellent).
            3. Identify key strengths and weaknesses in the CV formatting or content.
            4. Provide 2-3 specific "Rephrase Suggestions" where a weak sentence in the CV is rewritten into a strong, action-oriented, metric-driven bullet point.

            CRITICAL LANGUAGE RULES:
            - The overall analysis (strengths, weaknesses, and the 'reason' field) MUST BE in: ${lang === 'id' ? 'Indonesian' : 'English'}.
            - HOWEVER, the "improved" text inside "rephraseSuggestions" MUST BE written in the EXACT SAME LANGUAGE as the original CV text. Do NOT translate the user's CV content.
            
            Return ONLY a pure JSON object using this exact structure:
            {
                "atsScore": 85,
                "matchStatus": "High",
                "strengths": ["Clear work history", "Good use of keywords"],
                "weaknesses": ["Lack of quantifiable metrics", "Missing soft skills"],
                "rephraseSuggestions": [
                    {
                        "original": "<quote a weak sentence from the CV>",
                        "improved": "<rewrite it using action verbs and metrics in the CV's original language>",
                        "reason": "<explain why this is better in ${lang === 'id' ? 'Indonesian' : 'English'}>"
                    }
                ]
            }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const rawText = response.text().replace(/```json|```/gi, "").trim();
        return JSON.parse(rawText);
    } catch (error) {
        console.error("CV Analysis Error:", error);
        throw new Error("Failed to analyze CV with AI.");
    }
};

module.exports = { analyzeCvWithAI };