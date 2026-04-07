const axios = require('axios');

exports.verifyTurnstile = async (req, res, next) => {
    // 1. Kalau user sudah login, langsung lolos! Nggak perlu verifikasi human lagi.
    if (req.user) {
        return next();
    }

    // 2. Kalau guest, wajib ada token dari FE
    const token = req.body.cfToken;
    if (!token) {
        return res.status(403).json({ success: false, message: "Human verification required. Please check the captcha." });
    }

    try {
        // 3. Verifikasi ke server Cloudflare
        const response = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            secret: process.env.TURNSTILE_SECRET_KEY, // Kamu harus daftar Cloudflare gratis buat dapet ini
            response: token
        });

        if (response.data.success) {
            next(); // Human diverifikasi! Lanjut scan!
        } else {
            res.status(403).json({ success: false, message: "Captcha verification failed. Are you a bot?" });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: "Error contacting verification server." });
    }
};