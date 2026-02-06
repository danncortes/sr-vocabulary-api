import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { getAudio, generateAudioPhrases, generateAudioFromText, deleteAudios } from './audio.handlers.js';

const router = express.Router();
router.get('/generate-audios', authenticateToken, generateAudioPhrases);
router.post('/generate', authenticateToken, generateAudioFromText);
router.post('/delete', authenticateToken, deleteAudios);
router.get('/:filename', authenticateToken, getAudio);

export default router;