# 🛡️ JobScam Detector API - Capstone Project

Backend API untuk deteksi penipuan lowongan kerja menggunakan AI (Gemini 2.0 Flash Lite) dan OCR (Tesseract.js).

## 🚀 Base URL
`http://localhost:3001/api`

---

## 🛠️ API Endpoints

### 1. Job Detection (Scan)
Menganalisis konten lowongan kerja dari berbagai sumber.
- **URL:** `/scan/detect`
- **Method:** `POST`
- **Content-Type:** `multipart/form-data` (Jika upload gambar) atau `application/json` (Jika teks/URL).
- **Headers:** 
  - `Accept-Language`: `id` | `en` (Default: `en`)
- **Body:**
  | Key | Type | Required | Description |
  | :--- | :--- | :--- | :--- |
  | `file` | File | Optional | File gambar loker (JPG/PNG). |
  | `url` | String | Optional | URL link loker (Scraping mode). |
  | `content` | String | Optional | Teks loker (Manual copy-paste). |
  | `source` | String | Optional | `whatsapp`, `telegram`, `instagram`, `facebook`, `linkedin`, `other`. |

### 2. General Statistics (Dashboard)
Mendapatkan data untuk kebutuhan chart/grafik di dashboard.
- **URL:** `/stats`
- **Method:** `GET`
- **Response Preview:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "bySource": [
      { "_id": "whatsapp", "count": 80 },
      { "_id": "telegram", "count": 40 }
    ],
    "byVerdict": [
      { "_id": "Legit", "count": 30 },
      { "_id": "High Risk", "count": 120 }
    ]
  }
}