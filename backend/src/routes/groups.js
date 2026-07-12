const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { clean } = require('../lib/sanitize');
const { notify } = require('../lib/push');

const router = express.Router();

// FR7 Study Group Creation
router.post('/', requireAuth, async (req, res) => {
  const { name, description, subjectTag, memberLimit } = req.body;
  if (!name || !description || !subjectTag) {
    return res.status(400).json({ message: 'name, description, and subjectTag are required' });
  }

  const group = await prisma.studyGroup.create({
    data: {
      creatorId: req.user.userId,
      name: clean(name),
      description: clean(description),
      subjectTag: clean(subjectTag),
      memberLimit: memberLimit ? Number(memberLimit) : 20,
      memberships: { create: { userId: req.user.userId, status: 'APPROVED' } },
    },
  });

  res.status(201).json(group);
});

router.get('/', requireAuth, async (req, res) => {
  const { subjectTag } = req.query;
  const groups = await prisma.studyGroup.findMany({
    where: subjectTag ? { subjectTag: { contains: subjectTag, mode: 'insensitive' } } : undefined,
    include: {
      creator: { select: { id: true, name: true } },
      _count: { select: { memberships: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(groups);
});

// FR7.1 Study Group Membership - request to join
router.post('/:id/join', requireAuth, async (req, res) => {
  const group = await prisma.studyGroup.findUnique({ where: { id: req.params.id } });
  if (!group) return res.status(404).json({ message: 'Study group not found' });

  const existing = await prisma.groupMembership.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: req.user.userId } },
  });
  if (existing) return res.status(409).json({ message: 'You already requested or joined this group' });

  const membership = await prisma.groupMembership.create({
    data: { groupId: group.id, userId: req.user.userId, status: 'PENDING' },
  });
  await notify(group.creatorId, 'GROUP_JOIN_REQUEST', `New request to join "${group.name}"`);

  res.status(201).json(membership);
});

// Group creator approves/declines a join request
router.patch('/:id/members/:userId', requireAuth, async (req, res) => {
  const { status } = req.body; // 'APPROVED' or a DELETE-style decline
  const group = await prisma.studyGroup.findUnique({ where: { id: req.params.id } });
  if (!group) return res.status(404).json({ message: 'Study group not found' });
  if (group.creatorId !== req.user.userId) {
    return res.status(403).json({ message: 'Only the group creator can manage membership' });
  }

  if (status === 'APPROVED') {
    const membership = await prisma.groupMembership.update({
      where: { groupId_userId: { groupId: group.id, userId: req.params.userId } },
      data: { status: 'APPROVED' },
    });
    await notify(req.params.userId, 'GROUP_JOIN_APPROVED', `You've been added to "${group.name}"`);
    return res.json(membership);
  }

  await prisma.groupMembership.delete({
    where: { groupId_userId: { groupId: group.id, userId: req.params.userId } },
  });
  res.json({ message: 'Request declined' });
});

router.get('/:id/members', requireAuth, async (req, res) => {
  const members = await prisma.groupMembership.findMany({
    where: { groupId: req.params.id, status: 'APPROVED' },
    include: { user: { select: { id: true, name: true, subjects: true } } },
  });
  res.json(members);
});

module.exports = router;
