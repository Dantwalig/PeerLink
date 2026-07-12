const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth, requireTutor } = require('../middleware/auth');

const router = express.Router();

// FR3 Tutor Search - by subject, faculty, availability, minimum rating
router.get('/search', requireAuth, async (req, res) => {
  const { subject, faculty, minRating } = req.query;

  const tutors = await prisma.user.findMany({
    where: {
      isTutor: true,
      isVerified: true,
      ...(subject && { subjects: { contains: subject, mode: 'insensitive' } }),
      ...(faculty && { faculty: { contains: faculty, mode: 'insensitive' } }),
      ...(minRating && { rating: { gte: Number(minRating) } }),
    },
    select: {
      id: true, name: true, faculty: true, yearOfStudy: true,
      subjects: true, bio: true, rating: true,
    },
    orderBy: { rating: 'desc' },
  });

  res.json(tutors);
});

// FR3.1 Tutor Profile View - full profile, open slots, and reviews
router.get('/:id', requireAuth, async (req, res) => {
  const tutor = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, name: true, faculty: true, yearOfStudy: true, subjects: true, bio: true, rating: true,
      availability: { where: { isBooked: false, startTime: { gte: new Date() } }, orderBy: { startTime: 'asc' } },
      ratingsReceived: {
        select: { score: true, comment: true, createdAt: true, fromUser: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!tutor) return res.status(404).json({ message: 'Tutor not found' });
  res.json(tutor);
});

// Tutor manages their own availability
router.post('/availability', requireAuth, requireTutor, async (req, res) => {
  const { startTime, endTime } = req.body;
  if (!startTime || !endTime) return res.status(400).json({ message: 'startTime and endTime are required' });

  const slot = await prisma.availability.create({
    data: { tutorId: req.user.userId, startTime: new Date(startTime), endTime: new Date(endTime) },
  });
  res.status(201).json(slot);
});

router.get('/me/availability', requireAuth, requireTutor, async (req, res) => {
  const slots = await prisma.availability.findMany({
    where: { tutorId: req.user.userId },
    orderBy: { startTime: 'asc' },
  });
  res.json(slots);
});

module.exports = router;
