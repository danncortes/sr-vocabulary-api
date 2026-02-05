import express from 'express';
import { getAudio, generateAudioPhrases, generateAudioFromText, deleteAudios } from './audio.handlers.js';

const router = express.Router();

router.get('/generate-audios', generateAudioPhrases);
router.post('/generate', generateAudioFromText);
router.post('/delete', deleteAudios);
router.get('/:filename', getAudio);

export default router;