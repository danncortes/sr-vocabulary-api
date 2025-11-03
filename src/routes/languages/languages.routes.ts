import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { getLanguageTranslations } from './languages.handlers.js';

const router = express.Router();

router.get('/translations', authenticateToken, getLanguageTranslations);

export default router;