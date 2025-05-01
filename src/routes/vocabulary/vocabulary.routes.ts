import express from 'express';
import { getNewVocabulary, getReviewVocabulary, setVocabularyReviewed } from './vocabulary.handlers.js';

const router = express.Router();

router.get('/new', getNewVocabulary);
router.get('/review', getReviewVocabulary);
router.post('/review', setVocabularyReviewed);

export default router;