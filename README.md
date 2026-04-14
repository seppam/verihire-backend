# VeriHire Backend API

The VeriHire backend is a robust Node.js/Express service that handles AI analysis, user authentication, and cumulative payment processing.

## 🔑 Environment Variables

Create a `.env` file in the root of the `backend/` directory:

```env
PORT=3001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d

# AI API Keys
GEMINI_API_KEY=your_gemini_key
ELICE_API_KEY=your_elice_key

# Payment & Email
MAYAR_API_KEY=your_mayar_clean_key
MAYAR_WEBHOOK_SECRET=your_mayar_webhook_key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USERNAME=your_gmail_address
EMAIL_PASSWORD=your_gmail_app_password
FRONTEND_URL=http://localhost:3000
```

## 🛠️ Technical Highlight: Atomic Idempotency

To ensure perfect reliability in payment processing, VeriHire implements **Atomic Webhook Idempotency**. 

In high-concurrency environments where a payment gateway might trigger multiple simultaneous webhooks, a standard "Find-Update-Save" pattern is prone to race conditions. VeriHire solves this using MongoDB's atomic `findOneAndUpdate` with a unique transaction check:

```javascript
const updatedUser = await User.findOneAndUpdate(
    { 
        _id: userId, 
        processedTransactions: { $ne: transactionId } // Atomic Guard
    },
    {
        $inc: { scanLimit: 120 },
        $push: { processedTransactions: transactionId },
        $set: { membershipExpires: calculatedNewExpiryDate }
    },
    { new: true }
);

if (updatedUser) {
    // Only send confirmation if the update actually happened
    await sendPaymentSuccessEmail(updatedUser, transactionId);
}
```
This pattern guarantees that tokens are added and transactions are recorded **exactly once**, even if multiple identical webhook signals arrive at once.

## 📈 Cumulative Membership Logic
VeriHire does not overwrite membership dates; it stacks them. 
- If a user is already Premium: `New Expiry = Current Expiry + 60 days`.
- If a user is Expired/Basic: `New Expiry = Now + 60 days`.

## 🛡️ Quota Guard
To protect user balance and platform resources:
- **Pre-validation**: Inputs < 50 characters are rejected before hitting AI APIs.
- **Atomic Balance**: Scan limits are ONLY decremented after a confirmed `success` response from the AI provider.
- **Auto-Switching**: Interface parity between Gemini and Elice GPT-5 allows for seamless provider switching if one service experiences downtime.

## 🛣️ API Endpoints

### Authentication
- `POST /api/auth/register` - Create account.
- `POST /api/auth/login` - Authenticate and receive JWT.
- `GET /api/auth/me` - Verifies token and returns full profile (**Used for Auth Persistence**).

### AI Scanning
- `POST /api/scan/detect` - Analyze job descriptions (supports OCR).
- `POST /api/cv/analyze` - Optimize CVs against target jobs.

### Payments
- `POST /api/payment/create-checkout` - Initialize Mayar payment.
- `POST /api/payment/webhook` - Atomic payment confirmation.

---

## 🏗️ Core Philosophy
- **Provider Agnostic**: Standardized payloads for all AI services.
- **Zero Loss Policy**: Quotas are preserved on failed requests or validation errors.
