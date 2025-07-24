import express from 'express';
import { createSBClient } from '../../superbaseClient.js';

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

            return res.status(200).json(verifiedData);
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

router.post('/login', login);

export default router;