const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const analyzeCvWithAI = async (cvText, jobTarget, lang = 'en') => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        
        const prompt = `
            You are an Expert Applicant Tracking System (ATS) and Senior Career Coach.
            Analyze the following CV text specifically against the Target Job.
            
            TARGET JOB / ROLE: "${jobTarget || 'General Professional'}"
            
            CV TEXT:
            "${cvText}"

            TASKS:
            1. Calculate an ATS match score (0-100) based strictly on how well the CV fits the Target Job.
            2. Determine the match status (Low, Medium, High, Excellent) with the Target Job.
            3. Identify key strengths in the CV THAT ARE HIGHLY RELEVANT to the Target Job.
            4. Identify weaknesses or missing skills in the CV THAT ARE REQUIRED for the Target Job.
            5. Provide 2-3 specific "Rephrase Suggestions" where a weak sentence in the CV is rewritten into a strong, metric-driven bullet point that aligns better with the Target Job's expected keywords.
            6. Provide 2-3 Alternative "Job Recommendations" based on the user's overall skills in the CV, but outside of their stated Target Job.

            CRITICAL LANGUAGE RULES:
            - The overall analysis (strengths, weaknesses, job recommendations, and the 'reason' field) MUST BE in: ${lang === 'id' ? 'Indonesian' : 'English'}.
            - HOWEVER, the "improved" text inside "rephraseSuggestions" MUST BE written in the EXACT SAME LANGUAGE as the original CV text. Do NOT translate the user's CV content.
            
            Return ONLY a pure JSON object using this exact structure:
            {
                "atsScore": 85,
                "matchStatus": "High",
                "strengths": ["<strength related to target job>"],
                "weaknesses": ["<weakness/gap related to target job>"],
                "rephraseSuggestions": [
                    {
                        "original": "<quote a sentence from CV>",
                        "improved": "<rewrite it using action verbs tailored for the target job, keep original language>",
                        "reason": "<explain why it fits the target job better in ${lang === 'id' ? 'Indonesian' : 'English'}>"
                    }
                ],
                "jobRecommendations": ["<Alternative Role 1>", "<Alternative Role 2>"]
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