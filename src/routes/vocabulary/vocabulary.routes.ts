import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import {
    getAllVocabulary,
    setVocabularyReviewed,
    delayManyVocabulary,
    resetManyVocabulary,
    restartManyVocabulary,
    loadTranslatedVocabulary,
    loadRawVocabulary
} from './vocabulary.handlers.js';

const router = Router();

// Apply authentication middleware to all routes that need it
router.get('/', authenticateToken, getAllVocabulary);
router.post('/review', authenticateToken, setVocabularyReviewed);
router.post('/delay', authenticateToken, delayManyVocabulary);
router.post('/reset', authenticateToken, resetManyVocabulary);
router.post('/restart', authenticateToken, restartManyVocabulary);
router.get('/load-translated', authenticateToken, loadTranslatedVocabulary);
router.get('/load-raw', authenticateToken, loadRawVocabulary);

export default router;