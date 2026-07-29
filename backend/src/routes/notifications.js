const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// FR9 Notifications - list mine
router.get('/mine', requireAuth, async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.userId },
    orderBy: { sentAt: 'desc' },
  });
  res.json(notifications);
});

router.patch('/:id/read', requireAuth, async (req, res) => {
  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!notification || notification.userId !== req.user.userId) {
    return res.status(404).json({ message: 'Notification not found' });
  }
  const updated = await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
  res.json(updated);
});

router.patch('/read-all', requireAuth, async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user.userId, isRead: false }, data: { isRead: true } });
  res.json({ message: 'All notifications marked read' });
});

module.exports = router;
