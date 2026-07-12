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
  const updated = await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
  res.json(updated);
});

module.exports = router;
