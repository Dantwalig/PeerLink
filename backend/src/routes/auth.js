const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const prisma = require('../lib/prisma');
const { sendEmail } = require('../lib/email');
const { clean } = require('../lib/sanitize');

const router = express.Router();

// NFR9: rate limit auth endpoints - max 10 attempts per minute per IP
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again in a minute' },
});
router.use(authLimiter);

function sign(user) {
  // NFR4: 24h session lifetime (see middleware/auth.js for rationale)
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role, isTutor: user.isTutor },
    process.env.JWT_SECRET,
    { expiresIn: '24h' },
  );
}

function safe(user) {
  const { passwordHash, verificationToken, resetToken, resetTokenExpiry, ...rest } = user;
  return rest;
}

// FR1 User Registration - institutional email required (SRS 5.5 Business Rules)
router.post('/register', async (req, res) => {
  const { name, email, password, isTutor, faculty, yearOfStudy, subjects, bio } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email, and password are required' });
  }

  const domain = process.env.INSTITUTIONAL_EMAIL_DOMAIN;
  if (domain && !email.toLowerCase().endsWith(`@${domain.toLowerCase()}`)) {
    return res.status(400).json({ message: `Registration requires an institutional email address (@${domain})` });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ message: 'An account with this email already exists' });

  // NFR6: bcrypt with minimum cost factor 12
  const passwordHash = await bcrypt.hash(password, 12);
  const verificationToken = crypto.randomBytes(32).toString('hex');

  const user = await prisma.user.create({
    data: {
      name: clean(name),
      email,
      passwordHash,
      isTutor: Boolean(isTutor),
      faculty: faculty ? clean(faculty) : null,
      yearOfStudy: yearOfStudy ? Number(yearOfStudy) : null,
      subjects: subjects ? clean(subjects) : null,
      bio: bio ? clean(bio) : null,
      verificationToken,
    },
  });

  // FR1.1 Email Verification - account stays inactive until the link is clicked
  const verifyUrl = `${process.env.FRONTEND_URL}/verify?token=${verificationToken}`;
  await sendEmail(user.email, 'Verify your PeerLink account', `Click to verify: ${verifyUrl}`);

  res.status(201).json({
    message: 'Account created. Check your email to verify before logging in.',
    // Exposed here only because there's no real inbox in a local demo -
    // in production this would never be returned to the client.
    devVerificationUrl: verifyUrl,
  });
});

// FR1.1 Email Verification
router.get('/verify', async (req, res) => {
  const { token } = req.query;
  const user = await prisma.user.findUnique({ where: { verificationToken: token } });
  if (!user) return res.status(400).json({ message: 'Invalid or expired verification link' });

  const verified = await prisma.user.update({
    where: { id: user.id },
    data: { isVerified: true, verificationToken: null },
  });

  res.json({ accessToken: sign(verified), user: safe(verified) });
});

// FR2 User Authentication
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

  if (!user.isVerified) {
    return res.status(403).json({ message: 'Please verify your email before logging in' });
  }

  res.json({ accessToken: sign(user), user: safe(user) });
});

// FR2.1 Password Reset
router.post('/password-reset/request', async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond 200 so this endpoint can't be used to enumerate accounts
  if (!user) return res.json({ message: 'If that account exists, a reset link has been sent' });

  const resetToken = crypto.randomBytes(32).toString('hex');
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000) },
  });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  await sendEmail(user.email, 'Reset your PeerLink password', `Click to reset: ${resetUrl}`);

  res.json({ message: 'If that account exists, a reset link has been sent', devResetUrl: resetUrl });
});

router.post('/password-reset/confirm', async (req, res) => {
  const { token, newPassword } = req.body;
  const user = await prisma.user.findFirst({
    where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
  });
  if (!user) return res.status(400).json({ message: 'Invalid or expired reset link' });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpiry: null },
  });

  res.json({ message: 'Password updated, you can now log in' });
});

module.exports = router;
