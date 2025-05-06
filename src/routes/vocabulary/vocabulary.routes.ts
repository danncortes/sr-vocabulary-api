import express from 'express';
import { setVocabularyReviewed, getAllVocabulary } from './vocabulary.handlers.js';

const router = express.Router();

router.get('', getAllVocabulary);
router.post('/review', setVocabularyReviewed);

export default router;