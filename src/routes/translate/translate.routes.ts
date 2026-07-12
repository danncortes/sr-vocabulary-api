import express from 'express';
import { translatePhrase } from './translate.handlers.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = express.Router();

router.post('/', authenticateToken, translatePhrase);

export default router;
