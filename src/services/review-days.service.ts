import { createSBClient } from '../supabaseClient.js';
import { getUserFromToken } from './user.service.js';

export const getUserReviewDays = async (token: string): Promise<number[]> => {
    const user = await getUserFromToken(token);
    const supabase = createSBClient(token);

    const { data, error } = await supabase
        .from('review_days')
        .select('weekday_id')
        .eq('user_id', user.id);

    if (error) {
        throw new Error(`Failed to fetch review days: ${error.message}`);
    }

    if (!data) {
        throw new Error('No review days data returned');
    }

    // Extract weekday_id values and return as number array
    return data.map(row => row.weekday_id);
};