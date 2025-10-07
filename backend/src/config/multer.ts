import multer from 'multer';
import fs from 'fs';
import crypto from 'crypto';
import config from './env';
import ApiError from '../utils/apiError';

// Ensure upload directory exists
const uploadDir = config.upload.path;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename: timestamp-uuid-originalname.pdf
    const uniqueSuffix = `${Date.now()}-${crypto.randomUUID()}`;
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  }
});

// File filter
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(ApiError.badRequest('Only PDF files are allowed', 'INVALID_FILE_TYPE'));
  }
};

// Multer instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.upload.maxFileSize, // 50MB default
    files: 1
  },
  fileFilter: fileFilter
});

export default upload;
