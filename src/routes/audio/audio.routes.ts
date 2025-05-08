import express from 'express';
import { getAudio, generateAudioPhrases } from './audio.handlers.js';

const router = express.Router();

router.get('/generate', generateAudioPhrases);
router.get('/:filename', getAudio);

export default router;