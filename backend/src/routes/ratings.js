const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { clean } = require('../lib/sanitize');

const router = express.Router();

// FR8 Tutor Rating and Review - only the student who attended may rate,
// only within 7 days of session completion (SRS 5.5 Business Rules)
router.post('/sessions/:sessionId', requireAuth, async (req, res) => {
  const { score, comment } = req.body;
  if (!score || score < 1 || score > 5) return res.status(400).json({ message: 'score must be 1-5' });

  const session = await prisma.tutorSession.findUnique({ where: { id: req.params.sessionId } });
  if (!session) return res.status(404).json({ message: 'Session not found' });
  if (session.studentId !== req.user.userId) {
    return res.status(403).json({ message: 'Only the student who attended may rate this session' });
  }
  if (session.status !== 'COMPLETED') {
    return res.status(400).json({ message: 'Can only rate a completed session' });
  }

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - new Date(session.endTime).getTime() > sevenDaysMs) {
    return res.status(400).json({ message: 'Rating window (7 days) has closed for this session' });
  }

  const rating = await prisma.rating.create({
    data: {
      sessionId: session.id,
      fromUserId: req.user.userId,
      toUserId: session.tutorId,
      score,
      comment: comment ? clean(comment) : null,
    },
  });

  // FR8.1 Rating Aggregation
  const agg = await prisma.rating.aggregate({ where: { toUserId: session.tutorId }, _avg: { score: true } });
  await prisma.user.update({ where: { id: session.tutorId }, data: { rating: agg._avg.score ?? score } });

  res.status(201).json(rating);
});

module.exports = router;
