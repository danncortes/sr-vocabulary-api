import { createSBClient } from '../supabaseClient.js';

export const getVocabularyById = async (id: number, token: string) => {
    const supabase = createSBClient(token);
    const result = await supabase
        .from('phrase_translations')
        .select('*')
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
    const supabase = createSBClient(token);
    const result = await supabase
        .from('phrase_translations')
        .select('*')
        .in('id', ids);

    if (result.error) {
        throw new Error(`Failed to fetch vocabulary items: ${result.error.message}`);
    }

    return result.data || [];
};