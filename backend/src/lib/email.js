/**
 * Email via Resend (SRS 3.3 Software Interfaces) - this is a real
 * integration, not a stub. Sign up free at https://resend.com, verify a
 * sending domain (or use their shared test domain for a demo), and create
 * an API key.
 *
 * Without RESEND_API_KEY set, sendEmail() logs to the console instead of
 * throwing - local dev and grading environments without a key still work
 * end to end (registration succeeds, the verification link is returned in
 * the API response for the demo), but no real email goes out until the key
 * is configured. Same graceful-degradation pattern as nodemailer/Gmail in
 * the faithhoopers project.
 */

const RESEND_API_URL = 'https://api.resend.com/emails';

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'PeerLink <onboarding@resend.dev>';

  if (!apiKey) {
    console.log(`\n--- [email] RESEND_API_KEY not set, logging instead of sending ---`);
    console.log(`To: ${to}\nSubject: ${subject}\n${html}`);
    console.log(`-------------------------------------------------------------------\n`);
    return { sent: false };
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] Resend API error (${res.status}):`, body);
      return { sent: false };
    }

    return { sent: true };
  } catch (err) {
    console.error('[email] Failed to send via Resend:', err);
    return { sent: false };
  }
}

function getAppUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function emailShell(bodyHtml) {
  return `
  <div style="background:#f5f7fb;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #dde3ee;padding:32px;">
      <p style="font-weight:bold;font-size:20px;color:#1F3864;margin:0 0 24px;">PeerLink</p>
      ${bodyHtml}
      <p style="color:#8892a6;font-size:12px;margin-top:32px;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  </div>`;
}

function emailButton(label, link) {
  return `
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${link}" style="display:inline-block;background:#1F3864;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:8px;">
        ${label}
      </a>
    </div>
    <p style="color:#8892a6;font-size:12px;word-break:break-all;margin:0 0 24px;">
      Or paste this link into your browser:<br/>
      <span style="color:#5a6478;">${link}</span>
    </p>`;
}

// FR1.1 Email Verification
function verificationEmailHtml({ name, link }) {
  return emailShell(`
    <p style="color:#16213a;font-size:16px;margin:0 0 8px;">Hi ${escapeHtml(name)},</p>
    <p style="color:#5a6478;font-size:14px;line-height:1.5;margin:0 0 24px;">
      Thanks for signing up for PeerLink! Click below to verify your email and activate your account.
    </p>
    ${emailButton('Verify email', link)}
    <p style="color:#8892a6;font-size:13px;margin:0;">This link expires in 24 hours.</p>
  `);
}

// FR2.1 Password Reset
function resetPasswordEmailHtml({ name, link }) {
  return emailShell(`
    <p style="color:#16213a;font-size:16px;margin:0 0 8px;">Hi ${escapeHtml(name)},</p>
    <p style="color:#5a6478;font-size:14px;line-height:1.5;margin:0 0 24px;">
      We received a request to reset your PeerLink password. Click below to choose a new one.
    </p>
    ${emailButton('Reset password', link)}
    <p style="color:#8892a6;font-size:13px;margin:0;">This link expires in 1 hour. If you didn't request this, your password won't change.</p>
  `);
}

module.exports = { sendEmail, getAppUrl, verificationEmailHtml, resetPasswordEmailHtml };
