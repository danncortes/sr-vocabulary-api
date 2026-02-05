import express from 'express';
import { translatePhrase } from './translate.handlers.js';

const router = express.Router();

router.post('/', translatePhrase);

export default router;
