import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { getUserSettings } from './user.handlers.js';

const router = express.Router();

router.get('/settings', authenticateToken, getUserSettings);

export default router;
