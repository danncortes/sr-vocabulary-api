import { createSBClient } from '../supabaseClient.js';
import { getUserFromToken } from './user.service.js';

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