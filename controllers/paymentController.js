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
    const transactionId = req.body.data?.id || req.body.data?.transactionId;
    
    console.log("EXTRACTED DESCRIPTION:", description);
    console.log("EXTRACTED STATUS:", status);
    console.log("TRANSACTION ID:", transactionId);

    if (description && description.startsWith('VERIHIRE_PREMIUM_')) {
        const parts = description.split('_');
        const userId = parts[2]; 
        console.log("TARGET USER ID:", userId);

        if (status === 'success' || status === 'paid') {
            // 1. FIRST FIND THE USER TO GET CURRENT EXPIRY (READ ONLY)
            const userRef = await User.findById(userId);
            if (!userRef) {
                console.log("ERROR: User not found in database for ID:", userId);
                return res.status(404).json({ message: 'User not found' });
            }

            // 2. CALCULATE NEW CUMULATIVE EXPIRY
            const now = new Date();
            const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
            let calculatedNewExpiryDate;

            if (userRef.membershipExpires && userRef.membershipExpires > now) {
                // Extension from existing
                calculatedNewExpiryDate = new Date(userRef.membershipExpires.getTime() + sixtyDaysMs);
            } else {
                // New/Reset from now
                calculatedNewExpiryDate = new Date(now.getTime() + sixtyDaysMs);
            }

            // 3. ATOMIC UPDATE WITH IDEMPOTENCY CHECK
            // We check that the transactionId is NOT inprocessedTransactions array
            const updatedUser = await User.findOneAndUpdate(
                { 
                    _id: userId, 
                    processedTransactions: { $ne: String(transactionId) } 
                },
                {
                    $set: { 
                        isPremium: true,
                        membershipExpires: calculatedNewExpiryDate,
                        premiumValidUntil: calculatedNewExpiryDate
                    },
                    $inc: { scanLimit: 120 },
                    $push: { processedTransactions: String(transactionId) }
                },
                { new: true } // Return the updated document
            );

            // 4. ONLY TRIGGER EMAIL IF DOCUMENT WAS ACTUALLY UPDATED
            // If updatedUser is null, it means the transactionId was already processed
            if (updatedUser) {
                console.log(`ATOMIC SUCCESS: User ${updatedUser.username} upgraded. New Total: ${updatedUser.scanLimit}.`);
                
                try {
                    const formattedDate = updatedUser.membershipExpires.toLocaleDateString('en-GB', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                    });

                    const isExtension = updatedUser.membershipExpires.getTime() > (now.getTime() + sixtyDaysMs + 1000);

                    await sendEmail({
                        email: updatedUser.email,
                        subject: isExtension ? "VeriHire Premium Extended!" : "Welcome to VeriHire Premium!",
                        title: isExtension ? "Stay Premium!" : "Upgrade Successful!",
                        message: isExtension 
                            ? `Dear ${updatedUser.username},\r\n\r\nYour premium status has been successfully extended until ${formattedDate}! You have received 120 additional scan tokens.\r\n\r\nYou now have a total of ${updatedUser.scanLimit} tokens available.`
                            : `Dear ${updatedUser.username},\r\n\r\nYour account has been successfully upgraded! You have received 120 additional scan tokens.\r\n\r\nYou now have a total of ${updatedUser.scanLimit} tokens available.\r\n\r\nYour premium status is valid until ${formattedDate} (60 days from now).`,
                        buttonText: "Get Started",
                        buttonLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile`
                    });
                } catch (emailError) {
                    console.error("Webhook Email Error:", emailError.message);
                }
            } else {
                console.log(`IDEMPOTENCY: Transaction ${transactionId} already processed. Skipping duplicate logic.`);
            }
        }
    }

    // Always respond 200 to Mayar to stop retries
    res.status(200).send('OK');
});
