# VeriHire Backend API

The VeriHire backend is a robust Node.js/Express service that handles AI analysis, user authentication, and cumulative payment processing.

## 🔑 Environment Variables

Create a `.env` file in the root of the `backend/` directory:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# AI API Keys
GEMINI_API_KEY=your_gemini_key
ELICE_API_KEY=your_elice_key

# Payment & Email
MAYAR_API_KEY=your_mayar_clean_key
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password
FRONTEND_URL=http://localhost:3000
```

## 🛠️ Technical Highlight: Atomic Idempotency

To ensure perfect reliability in payment processing, VeriHire implements **Atomic Webhook Idempotency**. 

In high-concurrency environments where a payment gateway might trigger multiple simultaneous webhooks, a standard "Find-Update-Save" pattern is prone to race conditions. VeriHire solves this using MongoDB's atomic `findOneAndUpdate` with conditional filters:

```javascript
const updatedUser = await User.findOneAndUpdate(
    { 
        _id: userId, 
        processedTransactions: { $ne: transactionId } 
    },
    {
        $inc: { scanLimit: 120 },
        $push: { processedTransactions: transactionId },
        $set: { membershipExpires: calculatedNewExpiryDate }
    },
    { new: true }
);

if (updatedUser) {
    // Only send one confirmation email
    await sendEmail(...);
}
```
This pattern guarantees that tokens are added and transactions are recorded exactly once, even if multiple identical requests arrive at the same millisecond.

## 🛣️ API Endpoints

### Authentication
- `POST /api/auth/register` - Create a new account.
- `POST /api/auth/login` - Authenticate and receive JWT.
- `GET /api/auth/me` - Get current user profile.

### AI Scanning
- `POST /api/job/detect` - Analyze job descriptions for scams.
- `POST /api/cv/analyze` - Analyze and optimize CVs.

### Payments
- `POST /api/payment/checkout` - Initialize Mayar payment session.
- `POST /api/payment/webhook` - Atomic payment confirmation (Mayar).

---

## 🏗️ Core Architecture

- **Provider Agnostic AI**: Standardized interfaces for switching between Gemini and GPT-5 without breaking controllers.
- **Cumulative Expiry Logic**: Intelligent membership date calculation that stacks multiple purchases.
- **Quota Guard**: Backend-enforced limits that prevent token loss on invalid inputs.
