const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { upload, docTypeFor } = require('../lib/storage');
const { clean } = require('../lib/sanitize');

const router = express.Router();

// Fields safe to return in list/browse responses - deliberately excludes
// `data` (the file bytes) so listing stays lightweight even with large files.
const LIST_SELECT = {
  id: true, title: true, course: true, subject: true, docType: true,
  sizeBytes: true, createdAt: true,
  uploader: { select: { id: true, name: true } },
};

// FR5 Resource Sharing - upload with 50MB limit, PDF/DOCX/PNG/JPEG only (NFR5).
// The file's bytes are written straight into Postgres (see schema.prisma) so
// they survive redeploys on hosts with an ephemeral filesystem.
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
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      data: req.file.buffer,
    },
    select: LIST_SELECT,
  });

  res.status(201).json(resource);
});

// FR5.1 Resource browsing (no file bytes in the response - see LIST_SELECT)
router.get('/', requireAuth, async (req, res) => {
  const { course, subject } = req.query;
  const resources = await prisma.resource.findMany({
    where: {
      ...(course && { course: { contains: course, mode: 'insensitive' } }),
      ...(subject && { subject: { contains: subject, mode: 'insensitive' } }),
    },
    select: LIST_SELECT,
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

// FR5.1 Resource Download - streams the bytes straight out of Postgres
router.get('/:id/download', requireAuth, async (req, res) => {
  const resource = await prisma.resource.findUnique({ where: { id: req.params.id } });
  if (!resource) return res.status(404).json({ message: 'Resource not found' });

  res.set('Content-Type', resource.mimeType);
  res.set('Content-Disposition', `attachment; filename="${encodeURIComponent(resource.title)}"`);
  res.send(resource.data);
});

// Multer errors (oversized/wrong type) surface with a clean message
router.use((err, req, res, next) => {
  if (err) return res.status(400).json({ message: err.message });
  next();
});

module.exports = router;
