import express from 'express';
import { getLanguages, getLanguageTranslations } from './languages.handlers.js';

const router = express.Router();

router.get('/translations', getLanguageTranslations);
router.get('/', getLanguages);

export default router;