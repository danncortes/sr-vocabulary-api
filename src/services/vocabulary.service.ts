import { SupabaseClient } from '@supabase/supabase-js';
import { createSBClient } from '../supabaseClient.js';
import { getUserFromToken } from './user.service.js';
import { addDaysToDate } from '../utils/dates.js';

export const getVocabularyById = async (id: number, token: string) => {
    const user = await getUserFromToken(token);
    const supabase = createSBClient(token);
    const result = await supabase
        .from('phrase_translations')
        .select('*')
        .eq('user_id', user.id)
        .eq('id', id);

    if (result.error) {
        throw new Error(`Failed to fetch vocabulary with id ${id}: ${result.error.message}`);
    }

    if (!result.data || result.data.length === 0) {
        throw new Error(`Vocabulary with id ${id} not found`);
    }

    return result.data[0];
};

export const getVocabularyByIds = async (ids: number[], token: string) => {
    const user = await getUserFromToken(token);
    const supabase = createSBClient(token);
    const result = await supabase
        .from('phrase_translations')
        .select('*')
        .eq('user_id', user.id)
        .in('id', ids);

    if (result.error) {
        throw new Error(`Failed to fetch vocabulary items: ${result.error.message}`);
    }

    return result.data || [];
};

export const getManyVocabulary = async (ids: number[], token: string) => {
    const supabase = createSBClient(token);
    const user = await getUserFromToken(token);
    return supabase
        .from('phrase_translations')
        .select('*')
        .in('id', ids)
        .eq('user_id', user.id);
};

type DelayVocabularyProps = {
    vocabulary: any,
    days: number,
    userId: string,
    supabaseInstance: SupabaseClient<any, string, any>
}

export const delayVocabulary = async (props: DelayVocabularyProps): Promise<any> => {
    const { vocabulary, days, userId, supabaseInstance: supabase } = props;
    const { review_date } = vocabulary;
    const newReviewDate = addDaysToDate(review_date, days);
    const { error } = await supabase
        .from('phrase_translations')
        .update({
            review_date: newReviewDate
        })
        .eq('user_id', userId)
        .eq('id', vocabulary.id);

    if (error) {
        return { error: error.message };
    }
    return { data: { ...vocabulary, review_date: newReviewDate } }
};

export const resetVocabulary = async (id: number, userId: string, supabase: SupabaseClient<any, string, any>): Promise<any> => {
    const { data, error } = await supabase
        .from('phrase_translations')
        .update({
            sr_stage_id: 0,
            review_date: null,
            learned: 0
        })
        .eq('user_id', userId)
        .eq('id', id).select();

    if (error) {
        return { error: error.message };
    }
    return { data: data[0] }
};

type RestartVocabularyProps = {
    vocabularyId: number,
    userId: string,
    reviewDate: string,
    supabaseInstance: SupabaseClient<any, string, any>
}

export const restartVocabulary = async (props: RestartVocabularyProps): Promise<any> => {
    const { vocabularyId, userId, reviewDate, supabaseInstance: supabase } = props;

    const { data, error } = await supabase
        .from('phrase_translations')
        .update({
            sr_stage_id: 1,
            review_date: reviewDate,
            learned: 0
        })
        .eq('user_id', userId)
        .eq('id', vocabularyId).select();

    if (error) {
        return { error: error.message };
    }
    return { data: data[0] }
};

export const deleteVocabulary = async (
    vocabularyId: number,
    userId: string,
    supabase: SupabaseClient<any, string, any>
): Promise<any> => {
    // First, delete from phrase_translations and get the deleted row to know linked phrase IDs
    const { data: deletedTranslations, error: ptError } = await supabase
        .from('phrase_translations')
        .delete()
        .eq('user_id', userId)
        .eq('id', vocabularyId)
        .select('*');

    if (ptError) {
        return { error: ptError.message };
    }
    if (!deletedTranslations || deletedTranslations.length === 0) {
        return { error: 'Vocabulary not found' };
    }

    const deletedTranslation = deletedTranslations[0];
    const originalPhraseId = deletedTranslation.phrase_id;
    const translatedPhraseId = deletedTranslation.translated_phrase_id;

    // Helper to delete a phrase and remove its audio
    const deletePhraseAndAudio = async (phraseId: number | null | undefined) => {
        if (!phraseId) return;

        // Delete phrase and get its audio_url from the deleted row
        const { data: deletedPhrases, error: phrasesError } = await supabase
            .from('phrases')
            .delete()
            .eq('user_id', userId)
            .eq('id', phraseId)
            .select('audio_url');

        if (phrasesError) {
            throw new Error(phrasesError.message);
        }

        const deletedPhrase = deletedPhrases && deletedPhrases[0];
        const audioUrl = deletedPhrase?.audio_url;

        // If audio_url exists, remove audio from Supabase Storage
        if (audioUrl) {
            const bucket = process.env.SUPABASE_BUCKET || '';
            const { error: storageError } = await supabase.storage
                .from(bucket)
                .remove([audioUrl]);

            if (storageError) {
                throw new Error(storageError.message);
            }
        }
    };

    try {
        await deletePhraseAndAudio(originalPhraseId);
        await deletePhraseAndAudio(translatedPhraseId);
    } catch (error: any) {
        return { error: error.message || 'Failed to delete phrases or audio' };
    }

    return { data: vocabularyId };
}

