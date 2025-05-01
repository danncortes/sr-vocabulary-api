import { createSBClient } from "../../superbaseClient.js";
import { addDaysToDate } from "../../utils/dates.js";

export const getNewVocabulary = async (req: any, res: any): Promise<any> => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        const supabase = createSBClient(token);

        const { data, error } = await supabase
            .from('phrase_translations')
            .select(`
            id,
            sr_stage_id,
            review_date,
            priority,
            original_phrase:phrases!phrase_id (
                text,
                audio_url
            ),
            translated_phrase:phrases!translated_phrase_id (
                text,
                audio_url
            )
        `)
            .eq('learned', 0)
            .eq('review_date', "NULL")
            .order('priority', { ascending: true })
            .limit(12);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).send(data);

    } catch (error) {
        return res.status(500).json({ error: error });
    }
}

export const getReviewVocabulary = async (req: any, res: any): Promise<any> => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        const supabase = createSBClient(token);

        const { data, error } = await supabase
            .from('phrase_translations')
            .select(`
                id,
                sr_stage_id,
                review_date,
                original_phrase:phrases!phrase_id (
                    text,
                    audio_url
                ),
                translated_phrase:phrases!translated_phrase_id (
                    text,
                    audio_url
                )
            `)
            .eq('learned', 0)
            .gt('sr_stage_id', 0)
            .lte('review_date', new Date().toISOString().split('T')[0]);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).send(data);
    } catch (error) {
        return res.status(500).json({ error: error });
    }
}

const getVocabulary = (id: number, token: string) => {
    const supabase = createSBClient(token);
    return supabase
        .from('phrase_translations')
        .select('*')
        .eq('id', id);
}

export const setVocabularyReviewed = async (req: any, res: any): Promise<any> => {
    try {

        const token = req.headers.authorization?.replace('Bearer ', '');
        const supabase = createSBClient(token);

        const { id } = req.body;

        const vocabulary = await getVocabulary(id, token);

        if (vocabulary.error) {
            return res.status(500).json({ error: vocabulary.error.message });
        }

        const { review_date, sr_stage_id } = vocabulary.data[0];

        const stages = await supabase
            .from('stages')
            .select('*')
            .eq('id', sr_stage_id + 1);

        if (stages.error) {
            return res.status(500).json({ error: stages.error.message });
        }

        const { days } = stages.data[0];
        const newReviewDate = addDaysToDate(review_date, days);

        const { data, error } = await supabase
            .from('phrase_translations')
            .update({
                sr_stage_id: sr_stage_id + 1,
                review_date: newReviewDate
            })
            .eq('id', id);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).send(data);

    } catch (error) {
        return res.status(500).json({ error: error });
    }
}

export const delayVocabulary = async (req: any, res: any): Promise<any> => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        const supabase = createSBClient(token);
        const { id, delays_days } = req.body;

        const vocabulary = await getVocabulary(id, token);

        if (vocabulary.error) {
            return res.status(500).json({ error: vocabulary.error.message });
        }

        const { review_date } = vocabulary.data[0];

        const newReviewDate = addDaysToDate(review_date, delays_days);

        const { data, error } = await supabase
            .from('phrase_translations')
            .update({
                review_date: newReviewDate
            })
            .eq('id', id);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).send(data);

    } catch (error) {
        return res.status(500).json({ error: error });
    }
}