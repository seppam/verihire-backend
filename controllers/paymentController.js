const axios = require('axios');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const sendEmail = require('../utils/sendEmail');

/**
 * Verify Mayar webhook signature.
 * Mayar signs the payload with HMAC-SHA256 using MAYAR_WEBHOOK_SECRET.
 * This prevents attackers from forging fake "success" webhook calls.
 */
function verifyMayarWebhook(req) {
  const secret = process.env.MAYAR_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[Webhook] MAYAR_WEBHOOK_SECRET not set — skipping signature verification');
    return true; // Fail open in dev, but warn
  }

  // Mayar may send the signature in headers or in the body
  const signature =
    req.headers['x-mayar-signature'] ||
    req.headers['x-signature'] ||
    req.body?.signature;

  if (!signature) {
    console.warn('[Webhook] No signature found in Mayar webhook request');
    return false;
  }

  const crypto = require('crypto');
  const rawBody = typeof req.rawBody === 'string'
    ? req.rawBody
    : JSON.stringify(req.body);

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);

  // Constant-time comparison to prevent timing attacks
  if (sigBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

exports.checkout = catchAsync(async (req, res, next) => {
  const { phoneNumber } = req.body;

  // Save real phone number to DB
  if (phoneNumber) {
    req.user.phoneNumber = phoneNumber;
    await req.user.save();
  }

  const apiKey = String(process.env.MAYAR_API_KEY).replace(/\s/g, '').replace(/['"]+/g, '');

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
    const response = await axios.post(
      'https://api.mayar.club/hl/v1/payment/create',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 15000
      }
    );

    if (response.data && response.data.data) {
      const checkoutUrl = response.data.data.link;

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
  // 1. Verify webhook signature
  if (!verifyMayarWebhook(req)) {
    console.warn('[Webhook] Invalid Mayar signature — rejecting request');
    return res.status(401).json({ received: false, error: 'Invalid signature' });
  }

  console.log("[Webhook] Valid signature received");

  const description =
    req.body.data?.productDescription ||
    req.body.data?.description ||
    req.body.productDescription ||
    req.body.description;

  const status = (req.body.data?.status || req.body.status || "").toLowerCase();
  const transactionId = req.body.data?.id || req.body.data?.transactionId;

  if (description && description.startsWith('VERIHIRE_PREMIUM_')) {
    const parts = description.split('_');
    const userId = parts[2];

    if (status === 'success' || status === 'paid') {
      // 1. Get current user expiry (read only)
      const userRef = await User.findById(userId);
      if (!userRef) {
        console.log("[Webhook] User not found for ID:", userId);
        return res.status(404).json({ received: true, error: 'User not found' });
      }

      // 2. Calculate new cumulative expiry
      const now = new Date();
      const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
      let calculatedNewExpiryDate;

      if (userRef.membershipExpires && userRef.membershipExpires > now) {
        calculatedNewExpiryDate = new Date(userRef.membershipExpires.getTime() + sixtyDaysMs);
      } else {
        calculatedNewExpiryDate = new Date(now.getTime() + sixtyDaysMs);
      }

      // 3. Atomic update with idempotency check
      const updatedUser = await User.findOneAndUpdate(
        {
          _id: userId,
          processedTransactions: { $ne: String(transactionId) }
        },
        {
          $set: {
            isPremium: true,
            membershipExpires: calculatedNewExpiryDate
          },
          $inc: { scanLimit: 120 },
          $push: { processedTransactions: String(transactionId) }
        },
        { new: true }
      );

      if (updatedUser) {
        console.log(`[Webhook] SUCCESS: User ${updatedUser.username} upgraded. New scanLimit: ${updatedUser.scanLimit}`);

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
              ? `Dear ${updatedUser.username},\n\nYour premium status has been successfully extended until ${formattedDate}! You have received 120 additional scan tokens.\n\nYou now have a total of ${updatedUser.scanLimit} tokens available.`
              : `Dear ${updatedUser.username},\n\nYour account has been successfully upgraded! You have received 120 additional scan tokens.\n\nYou now have a total of ${updatedUser.scanLimit} tokens available.\n\nYour premium status is valid until ${formattedDate} (60 days from now).`,
            buttonText: "Get Started",
            buttonLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile`
          });
        } catch (emailError) {
          console.error("[Webhook] Email error:", emailError.message);
        }
      } else {
        console.log(`[Webhook] Idempotency: Transaction ${transactionId} already processed.`);
      }
    }
  }

  // Always respond 200/JSON to Mayar to stop retries
  res.status(200).json({ received: true });
});
