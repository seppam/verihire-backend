const Tesseract = require('tesseract.js');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const extractTextFromUrl = async (url, lang = 'en') => {
    // 1. Siapkan Kamus Pesan (Dual Language)
    const messages = {
        en: {
            denied: "Access denied by the website's security. Please provide data manually:\n1. Copy-Paste the job text into the input field, OR\n2. Save the webpage as a PDF and upload it, OR\n3. Take a screenshot of the job posting and upload the image (JPG/PNG).",
            timeout: "Connection timeout. The website might be down or protected by Cloudflare. Please use the Screenshot or Copy-Paste method.",
            failed: "Failed to extract text from the link. Please use the Screenshot (JPG/PNG) or PDF upload method.",
            empty: "The website content is too short or unreadable by the system. Please use the Copy-Paste text method."
        },
        id: {
            denied: "Akses diblokir oleh sistem keamanan website. Harap berikan data secara manual:\n1. Copy-Paste teks lowongan ke kolom input, ATAU\n2. Save halaman website sebagai PDF lalu upload, ATAU\n3. Screenshot lowongan dan upload fotonya (JPG/PNG).",
            timeout: "Koneksi ke website terlalu lama (Timeout). Website mungkin sedang down atau dilindungi Cloudflare. Harap gunakan metode Screenshot atau Copy-Paste teks.",
            failed: "Gagal menarik teks dari link. Harap gunakan metode Screenshot (JPG/PNG) atau upload PDF.",
            empty: "Konten website terlalu sedikit atau tidak bisa dibaca sistem. Harap gunakan metode Copy-Paste teks."
        }
    };

    // 2. Pilih pesan sesuai bahasa (default ke 'en' jika tidak dikenali)
    const msg = messages[lang] || messages['en'];

    try {
        const { data } = await axios.get(url, { 
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        });

        const $ = cheerio.load(data);
        $('script, style, nav, footer, header').remove();
        let text = $('main').text() || $('article').text() || $('body').text();
        text = text.replace(/\s\s+/g, ' ').trim();

        if (text.length < 50) throw new Error(msg.empty);
        return text.substring(0, 2500);
    } catch (error) {
        // 3. Tangkap dan keluarkan error sesuai bahasa yang dipilih
        if (error.message === msg.empty) throw error; // Biarkan pesan "empty" lolos
        if (error.response?.status === 403) throw new Error(msg.denied);
        if (error.code === 'ECONNABORTED') throw new Error(msg.timeout);
        
        // Timpa error teknis bawaan axios dengan pesan 'failed' buatan kita
        throw new Error(msg.failed); 
    }
};

// const extractTextFromImage = async (fileBuffer, lang = 'en') => {
//     try {
//         const { data: { text } } = await Tesseract.recognize(fileBuffer, 'ind+eng');
//         if (!text || text.trim().length === 0) {
//             throw new Error("No text found in the image.");
//         }
//         return text;
//     } catch (error) {
//         throw new Error("Failed to process image.");
//     }
// };

const analyzeContent = async (text, lang = 'en') => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        
        // PROMPT TUNING: Kita beri persona, rubrik, dan toleransi OCR
        const prompt = `
            You are an expert HR Fraud Investigator. Your job is to analyze job vacancy texts and detect scams.
            Note: The text below is extracted via OCR from an image, so please tolerate and infer meaning from typos or garbled words.

            TEXT TO ANALYZE: 
            "${text}"

            ANALYSIS RUBRIC:
            - "High Risk": Mentions upfront payments/deposits, uses personal emails (e.g., @gmail, @yahoo) for supposedly large corporate roles, guarantees immediate hiring, or offers highly unrealistic salaries for entry-level tasks (e.g., liking posts, simple admin).
            - "Suspicious": Vague job descriptions, overly urgent tone, missing company details, or poorly structured contact info.
            - "Legit": Clear role, realistic requirements, standard application process, professional corporate contact info.

            Response Language MUST BE: ${lang === 'id' ? 'Indonesian' : 'English'}.
            
            Return ONLY a pure JSON object with no markdown formatting, using this exact structure:
            {
                "score": <number between 0-100. 0-40 is High Risk, 41-70 is Suspicious, 71-100 is Legit>,
                "verdict": "<strictly choose one: 'Legit', 'Suspicious', or 'High Risk'>",
                "flags": ["<array of specific suspicious points found in the text. Leave empty if Legit>"],
                "recommendation": "<1-2 sentences of actionable advice based on the verdict>"
            }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        // Membersihkan potensi markdown (```json ... ```) dari output Gemini
        const rawText = response.text().replace(/```json|```/gi, "").trim();
        return JSON.parse(rawText);
    } catch (error) {
        console.error("AI Analysis Error:", error); // Berguna buat debugging di terminal
        const errMsg = lang === 'id' ? 'Analisis AI gagal.' : 'AI analysis failed.';
        throw new Error(errMsg);
    }
};

module.exports = { extractTextFromUrl, analyzeContent };