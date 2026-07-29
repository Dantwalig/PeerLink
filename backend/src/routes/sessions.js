const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { createCalendarEvent } = require('../lib/calendar');
const { notify } = require('../lib/push');

const router = express.Router();

// FR4 Session Booking - student books an open availability slot with a tutor
router.post('/', requireAuth, async (req, res) => {
  const { tutorId, availabilityId, subject, location } = req.body;
  if (!tutorId || !availabilityId || !subject) {
    return res.status(400).json({ message: 'tutorId, availabilityId, and subject are required' });
  }

  const slot = await prisma.availability.findUnique({ where: { id: availabilityId } });
  if (!slot || slot.tutorId !== tutorId) return res.status(404).json({ message: 'Availability slot not found' });
  if (slot.isBooked) return res.status(400).json({ message: 'This time slot is already booked' });

  const [session] = await prisma.$transaction([
    prisma.tutorSession.create({
      data: {
        studentId: req.user.userId,
        tutorId,
        subject,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: 'CONFIRMED',
        location: location || null,
      },
    }),
    prisma.availability.update({ where: { id: availabilityId }, data: { isBooked: true } }),
  ]);

  // FR4.2 Calendar Integration (stubbed)
  const calendarEventId = await createCalendarEvent(session);
  await prisma.tutorSession.update({ where: { id: session.id }, data: { calendarEventId } });

  await notify(tutorId, 'SESSION_CONFIRMED', `New session booked: ${subject}`);
  await notify(req.user.userId, 'SESSION_CONFIRMED', `Your session "${subject}" is confirmed`);

  res.status(201).json(session);
});

// Either party can set/update where the session happens (Zoom link, room, etc.)
router.patch('/:id/location', requireAuth, async (req, res) => {
  const { location } = req.body;
  const session = await prisma.tutorSession.findUnique({ where: { id: req.params.id } });
  if (!session) return res.status(404).json({ message: 'Session not found' });
  if (![session.studentId, session.tutorId].includes(req.user.userId)) {
    return res.status(403).json({ message: 'You are not part of this session' });
  }

  const updated = await prisma.tutorSession.update({ where: { id: session.id }, data: { location } });
  const otherParty = req.user.userId === session.studentId ? session.tutorId : session.studentId;
  await notify(otherParty, 'SESSION_LOCATION_UPDATED', `Location set for "${session.subject}": ${location}`);

  res.json(updated);
});

// FR4.1 Session Cancellation
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  const session = await prisma.tutorSession.findUnique({ where: { id: req.params.id } });
  if (!session) return res.status(404).json({ message: 'Session not found' });
  if (![session.studentId, session.tutorId].includes(req.user.userId)) {
    return res.status(403).json({ message: 'You are not part of this session' });
  }
  if (session.status !== 'CONFIRMED') {
    return res.status(400).json({ message: `Cannot cancel a session in status ${session.status}` });
  }

  const updated = await prisma.tutorSession.update({ where: { id: session.id }, data: { status: 'CANCELLED' } });
  const otherParty = req.user.userId === session.studentId ? session.tutorId : session.studentId;
  await notify(otherParty, 'SESSION_CANCELLED', `A session was cancelled: ${session.subject}`);

  res.json(updated);
});

router.patch('/:id/complete', requireAuth, async (req, res) => {
  const session = await prisma.tutorSession.findUnique({ where: { id: req.params.id } });
  if (!session) return res.status(404).json({ message: 'Session not found' });
  if (req.user.userId !== session.tutorId) {
    return res.status(403).json({ message: 'Only the tutor can mark a session complete' });
  }
  const updated = await prisma.tutorSession.update({ where: { id: session.id }, data: { status: 'COMPLETED' } });
  await notify(session.studentId, 'SESSION_COMPLETED', `Session completed: ${session.subject}. Please leave a rating.`);
  res.json(updated);
});

router.get('/mine', requireAuth, async (req, res) => {
  const sessions = await prisma.tutorSession.findMany({
    where: { OR: [{ studentId: req.user.userId }, { tutorId: req.user.userId }] },
    include: {
      student: { select: { id: true, name: true } },
      tutor: { select: { id: true, name: true } },
      rating: true,
    },
    orderBy: { startTime: 'desc' },
  });
  res.json(sessions);
});

module.exports = router;
