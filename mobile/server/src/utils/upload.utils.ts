import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directories exist
const dirs = ['uploads/documents', 'uploads/profiles'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Configure storage for multer
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'photo_profile') {
      cb(null, 'uploads/profiles');
    } else {
      cb(null, 'uploads/documents');
    }
  },
  filename: (req, file, cb) => {
    // Format: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

/**
 * File filter to allow images and invoice PDFs
 */
const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Format de fichier non supporté. Veuillez envoyer une image ou un PDF.'), false);
  }
};

/**
 * Multer upload middleware
 */
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});
