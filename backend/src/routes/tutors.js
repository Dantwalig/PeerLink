const express = require('express');
const crypto = require('crypto');
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

// Tutor manages their own availability. Pass repeatWeeks > 1 to create the
// same slot on the same weekday/time for that many consecutive weeks - all
// slots share a recurrenceGroupId so they can be bulk-cancelled together.
router.post('/availability', requireAuth, requireTutor, async (req, res) => {
  const { startTime, endTime, repeatWeeks } = req.body;
  if (!startTime || !endTime) return res.status(400).json({ message: 'startTime and endTime are required' });

  const weeks = Math.min(Math.max(Number(repeatWeeks) || 1, 1), 12); // cap at 12 weeks so this can't be abused
  const recurrenceGroupId = weeks > 1 ? crypto.randomUUID() : null;

  const start = new Date(startTime);
  const end = new Date(endTime);
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  const slots = await prisma.$transaction(
    Array.from({ length: weeks }, (_, i) =>
      prisma.availability.create({
        data: {
          tutorId: req.user.userId,
          startTime: new Date(start.getTime() + i * WEEK_MS),
          endTime: new Date(end.getTime() + i * WEEK_MS),
          recurrenceGroupId,
        },
      }),
    ),
  );

  res.status(201).json(weeks > 1 ? slots : slots[0]);
});

router.get('/me/availability', requireAuth, requireTutor, async (req, res) => {
  const slots = await prisma.availability.findMany({
    where: { tutorId: req.user.userId },
    orderBy: { startTime: 'asc' },
  });
  res.json(slots);
});

// Cancel one slot, or every future slot in a recurring series if it has one
router.delete('/availability/:id', requireAuth, requireTutor, async (req, res) => {
  const slot = await prisma.availability.findUnique({ where: { id: req.params.id } });
  if (!slot || slot.tutorId !== req.user.userId) return res.status(404).json({ message: 'Slot not found' });
  if (slot.isBooked) return res.status(400).json({ message: 'Cannot delete a slot that is already booked' });

  const { seriesId } = req.query;
  if (seriesId === 'true' && slot.recurrenceGroupId) {
    await prisma.availability.deleteMany({
      where: { recurrenceGroupId: slot.recurrenceGroupId, isBooked: false, startTime: { gte: new Date() } },
    });
  } else {
    await prisma.availability.delete({ where: { id: slot.id } });
  }
  res.json({ message: 'Removed' });
});

module.exports = router;
