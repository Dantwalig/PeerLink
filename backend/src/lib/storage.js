/**
 * STUB: AWS S3 API (SRS 3.3 Software Interfaces, FR5).
 * Files are written to local disk (backend/uploads) instead of S3, and the
 * returned "fileUrl" is a local path. Multer enforces the 50MB limit and
 * PDF/DOCX/PNG/JPEG-only restriction from NFR5 either way.
 *
 * To go live: swap the multer diskStorage engine below for
 * multer-s3 pointed at AWS_S3_BUCKET.
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'image/png': 'IMAGE',
  'image/jpeg': 'IMAGE',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
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
