// server.js — Cake House inquiry backend (Express + Resend HTTP API)
//
// WHY THIS CHANGED FROM NODEMAILER/SMTP:
// Render's free web services block outbound traffic on SMTP ports 25, 465,
// and 587 (as of Sept 2025) — that's the exact "Connection timeout" you were
// seeing, and it happens regardless of whether SMTP_USER/SMTP_PASS are
// correct. Ethereal.email was also never going to help in production: it's
// a fake test inbox that doesn't deliver real mail.
//
// The fix: send email over plain HTTPS instead of SMTP, using Resend's API.
// HTTPS isn't blocked, and Resend has a generous free tier.
//
// SETUP:
// 1. Sign up at https://resend.com (free) and grab an API key.
// 2. In Render → your service → Environment, set:
//      RESEND_API_KEY   = re_xxxxxxxxxxxx        (from Resend dashboard)
//      NOTIFY_EMAIL     = yoganshya@gmail.com     (where inquiries land)
//      FROM_EMAIL       = onboarding@resend.dev   (works with no domain
//                                                   setup; swap for your own
//                                                   verified domain later)
// 3. Remove SMTP_HOST / SMTP_PORT / SMTP_SECURE / SMTP_USER / SMTP_PASS —
//    they're no longer used.
// 4. Remove "nodemailer" from package.json (no longer a dependency); this
//    file only needs Node's built-in fetch (Node 18+, which Render uses).

require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Trust proxy for Render =====
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

// ===== Resend email config =====
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'yoganshya@gmail.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

console.log('--- Email Configuration (Resend HTTP API) ---');
console.log('From:', FROM_EMAIL);
console.log('Notify:', NOTIFY_EMAIL);
console.log('API key set:', RESEND_API_KEY ? 'yes' : 'NO — set RESEND_API_KEY in Environment Variables');
console.log('-----------------------------------------------');

// Helper to escape user input for HTML email
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendInquiryEmail({ name, phone, cakeType, message }) {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set');
  }

  const payload = {
    from: `Cake House Website <${FROM_EMAIL}>`,
    to: [NOTIFY_EMAIL],
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
      </div>
    `
  };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Resend API error (${res.status}): ${errText}`);
  }

  return res.json();
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

    await sendInquiryEmail({ name, phone, cakeType, message });
    console.log('✅ Email sent successfully via Resend');

    res.json({ ok: true, message: 'Inquiry sent successfully! We will contact you shortly.' });
  } catch (err) {
    console.error('❌ Error sending inquiry email:', err.message);

    // Be honest with the customer this time — if email genuinely failed,
    // tell them so they know to try WhatsApp or call instead, rather than
    // silently losing their inquiry.
    res.status(502).json({
      ok: false,
      error: 'Could not send your inquiry by email right now. Please try WhatsApp or call us directly.'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ ok: true, emailConfigured: Boolean(RESEND_API_KEY) });
});

// ===== Start the server =====
app.listen(PORT, () => {
  console.log(`Cake House server running on http://localhost:${PORT}`);
});
