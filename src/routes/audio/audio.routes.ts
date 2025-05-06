import express from 'express';
import { getAudio } from './audio.handlers.js';

const router = express.Router();

router.get('/:filename', getAudio);

export default router;