const nodemailer = require('nodemailer');

// --- Fungsi Template HTML ---
const createEmailTemplate = (title, message, buttonText, buttonLink) => {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; padding: 40px 20px; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        <div style="background-color: #2563eb; padding: 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">VeriHire</h1>
        </div>
        <div style="padding: 40px 30px;">
          <h2 style="color: #1e293b; margin-top: 0;">${title}</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #475569;">
            ${message.replace(/\n/g, '<br>')}
          </p>
          ${buttonLink ? `
            <div style="text-align: center; margin-top: 30px;">
              <a href="${buttonLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">${buttonText}</a>
            </div>
          ` : ''}
        </div>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 14px; color: #94a3b8;">&copy; ${new Date().getFullYear()} VeriHire. All rights reserved.</p>
        </div>
      </div>
    </div>
  `;
};

// --- Fungsi Utama Pengirim Email ---
const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true, // Gunakan SSL untuk port 465
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  // Generate HTML menggunakan template
  const htmlContent = createEmailTemplate(
    options.title, 
    options.message, 
    options.buttonText, 
    options.buttonLink
  );

  const mailOptions = {
    from: `VeriHire Security <${process.env.EMAIL_USERNAME}>`,
    to: options.email,
    subject: options.subject,
    html: htmlContent, // Kita pakai HTML, bukan text biasa
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;