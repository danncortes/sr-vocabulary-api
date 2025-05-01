import express from 'express';
import { createSBClient } from '../../superbaseClient.js';

const router = express.Router();

const login = async (req: any, res: any): Promise<any> => {
    const supabase = createSBClient();
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.json({
        access_token: data.session.access_token,
        user: data.user
    });

}

router.post('/login', login);

export default router;