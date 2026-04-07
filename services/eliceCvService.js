const axios = require('axios');

const generateImprovedCvText = (originalText, suggestions) => {
    let newText = originalText;
    if (!suggestions || suggestions.length === 0) return newText;
    suggestions.forEach(suggestion => {
        if (suggestion.original && suggestion.improved) {
            const parts = newText.split(suggestion.original);
            if (parts.length > 1) {
                newText = parts.join(suggestion.improved);
            }
        }
    });
    return newText;
};

const analyzeCvWithAI = async (cvText, jobTarget, lang = 'en') => {
    try {
        const systemPrompt = `
            You are an Expert Career Coach and Recruitment Analyst.
            Analyze the following CV text specifically against the Target Job.
            
            TARGET JOB / ROLE: "${jobTarget || 'General Professional'}"
            
            TASKS:
            1. Calculate a CV Match Score (0-100) based strictly on how well the CV fits the Target Job.
            2. Determine the match status (Low, Medium, High, Excellent).
            3. Identify key strengths in the CV THAT ARE HIGHLY RELEVANT to the Target Job.
            4. Identify weaknesses or missing skills in the CV THAT ARE REQUIRED for the Target Job.
            5. Provide "Improvement Advice": If the score is below 60, give 2-3 concrete, actionable steps to bridge the skill gap. If the score is 60 or above, provide advanced interview preparation tips.
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

        const url = "https://mlapi.run/ec6741df-87b6-4eb2-8db5-142337cd29a8/v1/chat/completions";
        const payload = {
            model: "openai/gpt-5-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `CV TEXT:\n"${cvText}"` }
            ],
            // temperature: 0.2, 
            response_format: { type: "text" } 
        };

        const headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "Authorization": `Bearer ${process.env.ELICE_API_KEY}`
        };

        const response = await axios.post(url, payload, { headers });
        const rawText = response.data.choices[0].message.content;
        
        const cleanJsonText = rawText.replace(/```json|```/gi, "").trim();
        return JSON.parse(cleanJsonText);
        
    } catch (error) {
        console.error("Elice CV Analysis Error:", error.response ? error.response.data : error.message);
        const errorMsg = lang === 'id' ? 'Gagal menganalisis CV dengan AI.' : 'Failed to analyze CV with AI.';
        throw new Error(errorMsg);
    }
};

module.exports = { analyzeCvWithAI, generateImprovedCvText };