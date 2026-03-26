const Tesseract = require('tesseract.js');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const extractTextFromUrl = async (url, lang = 'en') => {
    const msg = {
        en: { 
            denied: "Access denied by the website. Please use Image or Text scan.",
            timeout: "Connection timeout. The website is too slow.",
            failed: "Failed to extract text from the link.",
            empty: "The website content is too short or unreadable."
        },
        id: { 
            denied: "Akses ditolak situs asal. Gunakan metode scan Gambar atau Teks.",
            timeout: "Waktu koneksi habis. Situs tujuan terlalu lambat.",
            failed: "Gagal mengambil teks dari link tersebut.",
            empty: "Konten website terlalu sedikit atau tidak bisa dibaca."
        }
    }[lang === 'id' ? 'id' : 'en'];

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
        if (error.response?.status === 403) throw new Error(msg.denied);
        if (error.code === 'ECONNABORTED') throw new Error(msg.timeout);
        throw new Error(error.message || msg.failed);
    }
};

const extractTextFromImage = async (fileBuffer, lang = 'en') => {
    try {
        const { data: { text } } = await Tesseract.recognize(fileBuffer, 'ind+eng');
        if (!text || text.trim().length === 0) {
            throw new Error(lang === 'id' ? "Teks tidak ditemukan dalam gambar." : "No text found in the image.");
        }
        return text;
    } catch (error) {
        throw new Error(lang === 'id' ? "Gagal memproses gambar." : "Failed to process image.");
    }
};

const analyzeContent = async (text, lang = 'en') => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        const prompt = `
            Analyze this job vacancy: "${text}"
            Response Language: ${lang === 'id' ? 'Indonesian' : 'English'}.
            
            Return ONLY a pure JSON object:
            {
                "score": 0-100,
                "verdict": "Legit" | "Suspicious" | "High Risk",
                "flags": ["reason 1", "reason 2"],
                "recommendation": "advice"
            }
        `;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return JSON.parse(response.text().replace(/```json|```/g, "").trim());
    } catch (error) {
        throw new Error(lang === 'id' ? "Analisis AI gagal." : "AI analysis failed.");
    }
};

module.exports = { extractTextFromUrl, extractTextFromImage, analyzeContent };