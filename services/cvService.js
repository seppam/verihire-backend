const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateImprovedCvText = (originalText, suggestions) => {
    let newText = originalText;

    if (!suggestions || suggestions.length === 0) return newText;

    suggestions.forEach(suggestion => {
        if (suggestion.original && suggestion.improved) {
            // Kita pakai split & join sebagai ganti .replace() 
            // agar lebih aman kalau ada karakter unik
            const parts = newText.split(suggestion.original);
            
            // Kalau kalimatnya ketemu di dalam teks CV
            if (parts.length > 1) {
                newText = parts.join(suggestion.improved);
            }
        }
    });

    return newText;
};

const analyzeCvWithAI = async (cvText, jobTarget, lang = 'en') => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        
        const prompt = `
            You are an Expert Career Coach and Recruitment Analyst.
            Analyze the following CV text specifically against the Target Job.
            
            TARGET JOB / ROLE: "${jobTarget || 'General Professional'}"
            
            CV TEXT:
            "${cvText}"

            TASKS:
            1. Calculate a CV Match Score (0-100) based strictly on how well the CV fits the Target Job.
            2. Determine the match status (Low, Medium, High, Excellent).
            3. Identify key strengths in the CV THAT ARE HIGHLY RELEVANT to the Target Job.
            4. Identify weaknesses or missing skills in the CV THAT ARE REQUIRED for the Target Job.
            5. Provide "Improvement Advice": If the score is below 60, give 2-3 concrete, actionable steps to bridge the skill gap (e.g., recommend specific certifications, tools to learn, or portfolio projects). If the score is 60 or above, provide advanced interview preparation tips.
            6. Provide 2-3 specific "Rephrase Suggestions" where a weak sentence in the CV is rewritten into a strong, metric-driven bullet point.
            7. Provide 2-3 Alternative "Job Recommendations" based on the user's overall skills in the CV, but outside of their stated Target Job.

            CRITICAL LANGUAGE RULES:
            - The overall analysis (strengths, weaknesses, improvement advice, job recommendations, and the 'reason' field) MUST BE in: ${lang === 'id' ? 'Indonesian' : 'English'}.
            - IMPORTANT FOR REPHRASING: First, automatically detect the language used in the CV TEXT. The "original" and "improved" strings inside "rephraseSuggestions" MUST BE written in the EXACT SAME LANGUAGE as the CV TEXT. NEVER translate the user's CV content into the UI language.
            
            Return ONLY a pure JSON object using this exact structure:
            {
                "cvMatchScore": 85,
                "matchStatus": "High",
                "strengths": ["<strength related to target job>"],
                "weaknesses": ["<weakness/gap related to target job>"],
                "improvementAdvice": ["<actionable advice to bridge the gap or prepare for interview>"],
                "rephraseSuggestions": [
                    {
                        "original": "<quote a sentence directly from the CV>",
                        "improved": "<rewrite it using action verbs tailored for the target job, strictly matching the CV's original language>",
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
        
        // Error message mendukung dual bahasa sesuai setting fallback sebelumnya
        const errorMsg = lang === 'id' ? 'Gagal menganalisis CV dengan AI.' : 'Failed to analyze CV with AI.';
        throw new Error(errorMsg);
    }
};

module.exports = { analyzeCvWithAI, generateImprovedCvText };