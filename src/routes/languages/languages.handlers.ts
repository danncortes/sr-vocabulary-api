import { createSBClient } from '../../supabaseClient.js';

export const getLanguages = async (req: any, res: any) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const supabase = createSBClient(token);

    const { data, error } = await supabase.from('languages').select('*');
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    return res.status(200).send(data);
};

export const getLanguageTranslations = async (req: any, res: any) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const supabase = createSBClient(token);

    const { data, error } = await supabase.from('language_translations').select('*');
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    return res.status(200).send(data);
};