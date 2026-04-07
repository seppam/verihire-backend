const axios = require('axios');

exports.verifyTurnstile = async (req, res, next) => {
    // 1. If user is already logged in, pass! No need to verify human again.
    if (req.user) {
        return next();
    }

    // 2. If guest, token from FE is required
    const token = req.body.cfToken;
    if (!token) {
        return res.status(403).json({ success: false, message: "Human verification required. Please check the captcha." });
    }

    try {
        // 3. Verify to Cloudflare server
        const response = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            secret: process.env.TURNSTILE_SECRET_KEY, // You must register for Cloudflare for free to get this
            response: token
        });

        if (response.data.success) {
            next(); // Human verified! Continue scan!
        } else {
            res.status(403).json({ success: false, message: "Captcha verification failed. Are you a bot?" });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: "Error contacting verification server." });
    }
};