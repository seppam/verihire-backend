const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');

const cleanText = (text) => {
    if (!text) return "";
    return text
        .replace(/\r\n/g, '\n')   // Standarisasi line break
        .replace(/\n+/g, '\n')    // Hapus baris kosong berlebih
        .replace(/[ \t]+/g, ' ')  // Hapus spasi/tab ganda
        .trim();
};

exports.extractTextFromFile = async (file) => {
    try {
        let extracted = "";
        
        if (file.mimetype === 'application/pdf') {
            const data = await pdfParse(file.buffer);
            extracted = data.text;
        } 
        else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ buffer: file.buffer });
            extracted = result.value;
        } 
        else if (file.mimetype.startsWith('image/')) {
            const { data: { text } } = await Tesseract.recognize(file.buffer, 'ind+eng');
            extracted = text;
        } else {
            throw new Error('Unsupported file format.');
        }

        // Jalankan pembersih teks sebelum di-return
        return cleanText(extracted);
    } catch (error) {
        throw new Error(`Failed to extract text from file: ${error.message}`);
    }
};