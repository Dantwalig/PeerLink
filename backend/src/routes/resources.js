const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { upload, docTypeFor } = require('../lib/storage');
const { clean } = require('../lib/sanitize');

const router = express.Router();

// FR5 Resource Sharing - upload with 50MB limit, PDF/DOCX/PNG/JPEG only (NFR5)
router.post('/', requireAuth, upload.single('file'), async (req, res) => {
  const { title, course, subject } = req.body; // FR5.2 categorization required
  if (!title || !course || !subject) {
    return res.status(400).json({ message: 'title, course, and subject are required' });
  }
  if (!req.file) return res.status(400).json({ message: 'A file is required' });

  const resource = await prisma.resource.create({
    data: {
      uploaderId: req.user.userId,
      title: clean(title),
      course: clean(course),
      subject: clean(subject),
      docType: docTypeFor(req.file.mimetype),
      fileUrl: `/uploads/${req.file.filename}`, // STUB: would be an S3 URL in production
    },
  });

  res.status(201).json(resource);
});

// FR5.1 Resource Download / browsing
router.get('/', requireAuth, async (req, res) => {
  const { course, subject } = req.query;
  const resources = await prisma.resource.findMany({
    where: {
      ...(course && { course: { contains: course, mode: 'insensitive' } }),
      ...(subject && { subject: { contains: subject, mode: 'insensitive' } }),
    },
    include: { uploader: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(resources);
});

// Distinct list of course codes already in use, for autocomplete on upload/search
router.get('/courses', requireAuth, async (req, res) => {
  const rows = await prisma.resource.findMany({
    distinct: ['course'],
    select: { course: true },
    orderBy: { course: 'asc' },
  });
  res.json(rows.map((r) => r.course));
});

// Multer errors (oversized/wrong type) surface with a clean message
router.use((err, req, res, next) => {
  if (err) return res.status(400).json({ message: err.message });
  next();
});

module.exports = router;
