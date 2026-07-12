const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { clean } = require('../lib/sanitize');

const router = express.Router();

// FR6 Peer Messaging - REST persists the message; Socket.io (wired in index.js)
// delivers it in real time to the receiver if they're connected.
router.post('/', requireAuth, async (req, res) => {
  const { receiverId, content } = req.body;
  if (!receiverId || !content) return res.status(400).json({ message: 'receiverId and content are required' });

  const message = await prisma.message.create({
    data: { senderId: req.user.userId, receiverId, content: clean(content) },
    include: { sender: { select: { id: true, name: true } } },
  });

  const io = req.app.get('io');
  io.to(`user:${receiverId}`).emit('message:new', message); // NFR3: real-time delivery

  res.status(201).json(message);
});

// Conversation thread between the current user and one other user
router.get('/thread/:otherUserId', requireAuth, async (req, res) => {
  const { otherUserId } = req.params;
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: req.user.userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: req.user.userId },
      ],
    },
    orderBy: { sentAt: 'asc' },
  });
  res.json(messages);
});

module.exports = router;
