import express from 'express';
import { setVocabularyReviewed, getAllVocabulary, delayManyVocabulary, loadRawVocabulary, loadTranslatedVocabulary } from './vocabulary.handlers.js';

const router = express.Router();

router.get('', getAllVocabulary);
router.post('/review', setVocabularyReviewed);
router.post('/delay', delayManyVocabulary);
router.get('/load-translated', loadTranslatedVocabulary);
router.get('/load-raw', loadRawVocabulary);

export default router;