const axios = require('axios');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const sendEmail = require('../utils/sendEmail');

exports.checkout = catchAsync(async (req, res, next) => {
    const { phoneNumber } = req.body;
    
    // 1. SAVE REAL PHONE NUMBER TO DB
    if (phoneNumber) {
        req.user.phoneNumber = phoneNumber;
        await req.user.save();
    }

    // --- MAYAR AUTH AUDIT ---
    console.log("--- MAYAR AUTH AUDIT ---");
    const apiKey = String(process.env.MAYAR_API_KEY).replace(/\s/g, '').replace(/['"]+/g, '');
    
    console.log("API Key Type:", typeof apiKey);
    console.log("CLEAN API KEY LENGTH:", apiKey.length);
    console.log("Final API Key Check - First 20 chars:", apiKey.substring(0, 20));
    console.log("Final API Key Check - Last 20 chars:", apiKey.substring(apiKey.length - 20));
    console.log("Payload Email:", req.user.email);

    // 2. USE AUTHENTIC USER DATA FOR MAYAR (STABLE SANDBOX VERSION)
    const uniqueDescription = `VERIHIRE_PREMIUM_${req.user._id}`;
    
    const payload = {
        name: req.user.username,
        email: req.user.email,
        amount: 50000,
        mobile: req.body.phoneNumber,
        description: uniqueDescription,
        redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile?status=success`
    };

    try {
        // Use STABLE Sandbox Endpoint as requested
        const response = await axios.post(
            'https://api.mayar.club/hl/v1/payment/create',
            payload,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );
        
        console.log("MAYAR FULL RESPONSE:", JSON.stringify(response.data, null, 2));

        if (response.data && response.data.data) {
            const checkoutUrl = response.data.data.link;
            console.log("MAYAR LINK GENERATED:", checkoutUrl);
            
            res.status(200).json({
                success: true,
                checkoutUrl: checkoutUrl
            });
        } else {
            throw new Error('Failed to generate payment link');
        }
    } catch (error) {
        console.error("Mayar Checkout Error:", error.response?.data ? JSON.stringify(error.response.data) : error.message);
        res.status(500).json({
            success: false,
            message: "Failed to initiate payment. Please try again later."
        });
    }
});

exports.webhook = catchAsync(async (req, res, next) => {
    console.log("WEBHOOK RECEIVED:", JSON.stringify(req.body, null, 2));

    const description = 
        req.body.data?.productDescription || 
        req.body.data?.description || 
        req.body.productDescription || 
        req.body.description;

    const status = (req.body.data?.status || req.body.status || "").toLowerCase();
    
    console.log("EXTRACTED DESCRIPTION:", description);
    console.log("EXTRACTED STATUS:", status);

    if (description && description.startsWith('VERIHIRE_PREMIUM_')) {
        const parts = description.split('_');
        const userId = parts[2]; 
        console.log("TARGET USER ID:", userId);

        // Mayar sends 'success', 'paid', or 'SUCCESS'
        if (status === 'success' || status === 'paid') {
            const user = await User.findById(userId);
            if (user) {
                user.isPremium = true;
                user.scanLimit += 100;
                
                // Set premium validity
                const now = new Date();
                if (user.premiumValidUntil && user.premiumValidUntil > now) {
                    user.premiumValidUntil = new Date(user.premiumValidUntil.setMonth(user.premiumValidUntil.getMonth() + 2));
                } else {
                    user.premiumValidUntil = new Date(now.setMonth(now.getMonth() + 2));
                }

                await user.save();
                console.log(`SUCCESS: User ${user.username} upgraded to Premium. New Limit: ${user.scanLimit}`);

                // EMAIL RECEIPT
                try {
                    await sendEmail({
                        email: user.email,
                        subject: "VeriHire Premium Upgrade Success!",
                        title: "Welcome to Premium!",
                        message: `Hi ${user.username},\r\n\r\nThank you for your payment. Your account has been upgraded to Premium.\r\n\r\nDetails:\r\n- Tokens Added: 100\r\n- New Total Tokens: ${user.scanLimit}\r\n- Premium Valid Until: ${user.premiumValidUntil.toLocaleDateString()}\r\n\r\nEnjoy your professional security tools!`,
                        buttonText: "Go to Dashboard",
                        buttonLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile`
                    });
                } catch (emailError) {
                    console.error("Webhook Email Error:", emailError.message);
                }
            } else {
                console.log("ERROR: User not found in database for ID:", userId);
            }
        } else {
            console.log("Status ignored or not paid:", status);
        }
    } else {
        console.log("Ignoring Webhook: Description missing or mismatch.");
    }

    // Always respond 200 to Mayar to stop retries
    res.status(200).send('OK');
});
