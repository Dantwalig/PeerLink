const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// FR10 User Dashboard - upcoming sessions, recent messages, joined groups, activity
router.get('/', requireAuth, async (req, res) => {
  const userId = req.user.userId;

  const [upcomingSessions, recentMessages, groups, unreadNotifications] = await Promise.all([
    prisma.tutorSession.findMany({
      where: {
        OR: [{ studentId: userId }, { tutorId: userId }],
        status: 'CONFIRMED',
        startTime: { gte: new Date() },
      },
      include: { student: { select: { name: true } }, tutor: { select: { name: true } } },
      orderBy: { startTime: 'asc' },
      take: 5,
    }),
    prisma.message.findMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      orderBy: { sentAt: 'desc' },
      take: 5,
      include: { sender: { select: { name: true } }, receiver: { select: { name: true } } },
    }),
    prisma.groupMembership.findMany({
      where: { userId, status: 'APPROVED' },
      include: { group: { select: { id: true, name: true, subjectTag: true } } },
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  res.json({ upcomingSessions, recentMessages, groups: groups.map((g) => g.group), unreadNotifications });
});

module.exports = router;
