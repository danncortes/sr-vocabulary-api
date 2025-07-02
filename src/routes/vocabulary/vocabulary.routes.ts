import express from 'express';
import { setVocabularyReviewed, getAllVocabulary, delayManyVocabulary } from './vocabulary.handlers.js';

const router = express.Router();

router.get('', getAllVocabulary);
router.post('/review', setVocabularyReviewed);
router.post('/delay', delayManyVocabulary);

export default router;