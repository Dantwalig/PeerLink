const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth, requireRole } = require('../middleware/auth');
const { notify } = require('../lib/push');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN'));

// Platform-wide stats for the admin dashboard
router.get('/stats', async (req, res) => {
  const [
    totalUsers, totalTutors, pendingTutors, totalStudents,
    totalSessions, confirmedSessions, completedSessions,
    totalResources, totalGroups, ratingAgg,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isTutor: true } }),
    prisma.user.count({ where: { isTutor: true, tutorVerified: false } }),
    prisma.user.count({ where: { isTutor: false } }),
    prisma.tutorSession.count(),
    prisma.tutorSession.count({ where: { status: 'CONFIRMED' } }),
    prisma.tutorSession.count({ where: { status: 'COMPLETED' } }),
    prisma.resource.count(),
    prisma.studyGroup.count(),
    prisma.rating.aggregate({ _avg: { score: true }, _count: true }),
  ]);

  res.json({
    totalUsers, totalTutors, pendingTutors, totalStudents,
    totalSessions, confirmedSessions, completedSessions,
    totalResources, totalGroups,
    averageRating: ratingAgg._avg.score || 0,
    totalRatings: ratingAgg._count,
  });
});

// List users, optionally filtered to tutors awaiting verification
router.get('/users', async (req, res) => {
  const { pendingOnly } = req.query;
  const users = await prisma.user.findMany({
    where: pendingOnly === 'true' ? { isTutor: true, tutorVerified: false } : undefined,
    select: {
      id: true, name: true, email: true, role: true, isTutor: true,
      isVerified: true, tutorVerified: true, faculty: true, subjects: true,
      rating: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
});

// FR3 (Platform Administrator function) - approve a tutor. Only after this
// does the tutor show up in student-facing search (see routes/tutors.js).
router.patch('/users/:id/verify-tutor', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user || !user.isTutor) return res.status(404).json({ message: 'Tutor not found' });

  const updated = await prisma.user.update({ where: { id: user.id }, data: { tutorVerified: true } });
  await notify(user.id, 'TUTOR_VERIFIED', "You're now a verified tutor and visible in search!");
  res.json(updated);
});

router.patch('/users/:id/revoke-tutor-verification', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user || !user.isTutor) return res.status(404).json({ message: 'Tutor not found' });

  const updated = await prisma.user.update({ where: { id: user.id }, data: { tutorVerified: false } });
  res.json(updated);
});

// Basic content moderation - remove a resource
router.delete('/resources/:id', async (req, res) => {
  const resource = await prisma.resource.findUnique({ where: { id: req.params.id } });
  if (!resource) return res.status(404).json({ message: 'Resource not found' });
  await prisma.resource.delete({ where: { id: resource.id } });
  res.json({ message: 'Resource removed' });
});

module.exports = router;
