import { Router } from 'express';
import { 
  registerMyDocument, 
  getMyDocuments,
  deleteDocument,
  reportDocumentLost
} from '../controllers/document.controller.ts';
import { authMiddleware } from '../middleware/auth.middleware.ts';
import { upload } from '../utils/upload.utils.ts';

const router = Router();

/**
 * Protected user document registration (with photos)
 */
router.post('/', authMiddleware, upload.fields([
  { name: 'photo_recto', maxCount: 1 },
  { name: 'photo_verso', maxCount: 1 }
]), registerMyDocument);

/**
 * Protected list of user's own documents
 */
router.get('/', authMiddleware, getMyDocuments);

/**
 * Protected document deletion
 */
router.delete('/:id', authMiddleware, deleteDocument);
router.patch('/:id/lost', authMiddleware, reportDocumentLost);

export default router;
