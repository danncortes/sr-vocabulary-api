import express from 'express';
import { setVocabularyReviewed, getAllVocabulary, delayManyVocabulary, loadRawVocabulary, loadTranslatedVocabulary, resetManyVocabulary, restartManyVocabulary } from './vocabulary.handlers.js';

const router = express.Router();

router.get('', getAllVocabulary);
router.post('/review', setVocabularyReviewed);
router.post('/delay', delayManyVocabulary);
router.post('/reset', resetManyVocabulary);
router.post('/restart', restartManyVocabulary);
router.get('/load-translated', loadTranslatedVocabulary);
router.get('/load-raw', loadRawVocabulary);

export default router;