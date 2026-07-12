/**
 * STUB: SendGrid Email API (SRS 3.3 Software Interfaces).
 * Logs the email instead of sending it, so registration/verification/reset
 * flows are fully testable without real SendGrid credentials.
 *
 * To go live: add SENDGRID_API_KEY to .env, `npm install @sendgrid/mail`,
 * and replace sendEmail() body with a real sgMail.send(...) call.
 */
async function sendEmail(to, subject, body) {
  console.log(`\n--- [STUB EMAIL via SendGrid] ---`);
  console.log(`To: ${to}\nSubject: ${subject}\n${body}`);
  console.log(`----------------------------------\n`);
  return { stub: true };
}

module.exports = { sendEmail };
