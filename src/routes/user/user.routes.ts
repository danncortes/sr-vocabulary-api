import express from 'express';
import { createSBClient } from '../../supabaseClient.js';
import { authenticateToken } from '../../middleware/auth.js';
import { getUserSettings } from './user.handlers.js';

const router = express.Router();

const login = async (req: any, res: any): Promise<any> => {
    const supabase = createSBClient();
    const { email, password, code } = req.body;

    const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        return res.status(400).json({ error: error.message, details: error });
    }

    if (data.user.factors?.length) {
        if (data.user.factors[0].status === 'unverified') {
            return res.status(200).json({ message: 'unverified', factorId: data.user.factors[0].id, token: data.session.access_token });
        } else {

            const { id: factorId } = data.user.factors[0]
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
                factorId
            });
            if (challengeError) {
                return res.status(400).json({ error: challengeError.message, details: challengeError });
            }

            const { data: verifiedData, error } = await supabase.auth.mfa.verify({
                factorId, // or phone
                code,
                challengeId: challengeData.id
            });

            if (error) {
                return res.status(400).json({ error: error.message, details: error });
            }

            return res.status(200).json({
                access_token: verifiedData.access_token,
                refresh_token: verifiedData.refresh_token,
            });
        }
    } else {
        const { error: mfaError, data: mfaData } = await supabase.auth.mfa.enroll({
            factorType: 'totp',
            friendlyName: email
        });

        if (mfaError) {
            return res.status(400).json({ error: mfaError.message, details: mfaError });
        }

        return res.status(200).json(mfaData);
    }
}

const refreshToken = async (req: any, res: any): Promise<any> => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
        return res.status(400).json({ error: 'Refresh token is required' });
    }

    const supabase = createSBClient();
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });

    if (error) {
        return res.status(401).json({ error: error.message });
    }

    return res.status(200).json({
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
    });
};

router.post('/login', login);
router.post('/refresh', refreshToken);
router.get('/settings', authenticateToken, getUserSettings);

export default router;