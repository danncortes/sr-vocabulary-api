import { createSBClient } from '../supabaseClient.js';
import { getUserFromToken } from './user.service.js';

export const getUserLearnDays = async (token: string): Promise<number[]> => {
    const user = await getUserFromToken(token);
    const supabase = createSBClient(token);

    const { data, error } = await supabase
        .from('learn_days')
        .select('weekday_id')
        .eq('user_id', user.id);

    if (error) {
        throw new Error(`Failed to fetch learn days: ${error.message}`);
    }

    if (!data) {
        throw new Error('No learn days data returned');
    }

    // Extract weekday_id values and return as number array
    return data.map(row => row.weekday_id);
};