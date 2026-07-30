/**
 * File uploads are held in memory just long enough for the route handler to
 * write the bytes into Postgres (see routes/resources.js) - nothing touches
 * local disk, so there's nothing for an ephemeral filesystem to lose on
 * redeploy. Multer enforces the 50MB limit and PDF/DOCX/PNG/JPEG-only
 * restriction from NFR5.
 *
 * If this ever needs to scale past student-project volume, swap
 * multer.memoryStorage() for multer-s3 and stop storing `data` on Resource -
 * everything downstream (the /download route) only needs to change its one
 * data source, not its API shape.
 */
const multer = require('multer');

const ALLOWED = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'image/png': 'IMAGE',
  'image/jpeg': 'IMAGE',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // NFR5: max 50MB per file
  fileFilter: (req, file, cb) => {
    if (!ALLOWED[file.mimetype]) {
      return cb(new Error('Only PDF, DOCX, PNG, and JPEG files are allowed'));
    }
    cb(null, true);
  },
});

function docTypeFor(mimetype) {
  return ALLOWED[mimetype] || 'PDF';
}

module.exports = { upload, docTypeFor };
