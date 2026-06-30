// server.js — Cake House inquiry backend (Express + Nodemailer)
require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Fix: Trust proxy for Render =====
app.set('trust proxy', 1); // Only trust the first proxy

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Basic protection against form spam/abuse
const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 submissions per IP per window
  message: { ok: false, error: 'Too many inquiries sent. Please try again later.' }
});

// ===== Mail transporter with Ethereal =====
console.log('--- SMTP Configuration ---');
console.log('Host:', process.env.SMTP_HOST);
console.log('Port:', process.env.SMTP_PORT);
console.log('Secure:', process.env.SMTP_SECURE === 'true');
console.log('User:', process.env.SMTP_USER);
console.log('--------------------------');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
});

// Verify SMTP connection
transporter.verify((err) => {
  if (err) {
    console.error('❌ SMTP connection failed:', err.message);
    console.error('Please check your SMTP_USER and SMTP_PASS in Environment Variables.');
  } else {
    console.log('✅ SMTP server is ready to send mail.');
  }
});

// Helper to escape user input for HTML email
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== Inquiry endpoint =====
app.post('/api/inquiry', inquiryLimiter, async (req, res) => {
  try {
    const { name, phone, cakeType, message } = req.body;

    // Basic server-side validation
    if (!name || !phone || !cakeType || !message) {
      return res.status(400).json({ ok: false, error: 'All fields are required.' });
    }
    if (name.length > 100 || phone.length > 30 || message.length > 2000) {
      return res.status(400).json({ ok: false, error: 'Input too long.' });
    }

    // Log the inquiry (so you can see it even if email fails)
    console.log('📧 New Inquiry Received:');
    console.log('Name:', name);
    console.log('Phone:', phone);
    console.log('Cake Type:', cakeType);
    console.log('Message:', message);
    console.log('---------------------------');

    const mailOptions = {
      from: `"Cake House Website" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Send to Ethereal inbox
      subject: `New Cake Inquiry — ${cakeType} (${name})`,
      text:
        `New inquiry from the Cake House website\n\n` +
        `Name: ${name}\n` +
        `Phone: ${phone}\n` +
        `Cake type: ${cakeType}\n\n` +
        `Message:\n${message}\n`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
          <h2 style="color:#4A2C1D;">New Cake Inquiry</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;font-weight:bold;width:120px;">Name</td><td>${escapeHtml(name)}</td></tr>
            <tr><td style="padding:6px 0;font-weight:bold;">Phone</td><td>${escapeHtml(phone)}</td></tr>
            <tr><td style="padding:6px 0;font-weight:bold;">Cake type</td><td>${escapeHtml(cakeType)}</td></tr>
          </table>
          <p style="font-weight:bold;margin-top:16px;">Message</p>
          <p style="white-space:pre-wrap;background:#FFF8F0;padding:14px;border-radius:8px;">${escapeHtml(message)}</p>
          <p style="color:#888;font-size:12px;margin-top:24px;">Sent automatically from the Cake House website contact form.</p>
          <p style="color:#888;font-size:12px;">Check your Ethereal inbox at https://ethereal.email/</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully to Ethereal');
    
    // Always return success to the user
    res.json({ ok: true, message: 'Inquiry sent successfully! We will contact you shortly.' });
  } catch (err) {
    console.error('Error sending inquiry email:', err);
    
    // Always return success to the user, even if email fails
    // This prevents customers from being confused
    res.json({ 
      ok: true, 
      message: 'Your inquiry was received! We will contact you shortly.' 
    });
    
    console.log('⚠️ Email failed but customer thinks it sent. Please check Render logs.');
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => res.json({ ok: true }));

// ===== Start the server =====
app.listen(PORT, () => {
  console.log(`Cake House server running on http://localhost:${PORT}`);
});
