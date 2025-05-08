import { createSBClient } from "../../superbaseClient.js";
import { addDaysToDate, getNextDateByDay, getTodaysDay, isDateLessThanToday } from "../../utils/dates.js";

export const getAllVocabulary = async (req: any, res: any): Promise<any> => {
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
            modified_at,
            learned,
            original:phrases!phrase_id (
                id,
                text,
                audio_url
            ),
            translated:phrases!translated_phrase_id (
                id,
                text,
                audio_url
            )
        `)
            .not('original', 'is', null)
            .not('translated', 'is', null)
            .not('original.audio_url', 'is', null)
            .not('translated.audio_url', 'is', null)
            .order('priority', { ascending: true })
            .order('review_date', { ascending: true })
            .order('id', { ascending: true });

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

        const { review_date, sr_stage_id, learned: isLearned } = vocabulary.data[0];

        const newStageId = sr_stage_id + 1;
        const learned = newStageId === 6 ? 1 : isLearned
        const stages = await supabase
            .from('stages')
            .select('*')
            .eq('id', newStageId);

        if (stages.error) {
            return res.status(500).json({ error: stages.error.message });
        }

        const { days } = stages.data[0];

        let newReviewDate: string | null = addDaysToDate(review_date, days);
        const todaysDay = getTodaysDay();

        // TODO - Review and learn days should come from the DB user settings.

        if (sr_stage_id === 0 && !['Monday', 'Tuesday'].includes(todaysDay)) {
            const nextLearnDay = getNextDateByDay('Monday');
            newReviewDate = addDaysToDate(nextLearnDay, days);
        } else if (sr_stage_id > 0 && sr_stage_id < 6 && isDateLessThanToday(review_date)) {
            if (['Wednesday', 'Thursday'].includes(todaysDay)) {
                newReviewDate = addDaysToDate('', days);
            } else {
                const nextReviewDate = getNextDateByDay('Wednesday');
                newReviewDate = addDaysToDate(nextReviewDate, days);
            }
        } else {
            newReviewDate = null
        }

        const { data, error } = await supabase
            .from('phrase_translations')
            .update({
                sr_stage_id: newStageId,
                review_date: newReviewDate,
                leaned: learned
            })
            .eq('id', id).select();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).send(data[0]);

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