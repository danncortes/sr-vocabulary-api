import { createSBClient } from '../supabaseClient.js';

export const getStageById = async (id: number, token: string) => {
    const supabase = createSBClient(token);
    const result = await supabase
        .from('stages')
        .select('*')
        .eq('id', id);

    if (result.error) {
        throw new Error(`Failed to fetch stage with id ${id}: ${result.error.message}`);
    }

    if (!result.data || result.data.length === 0) {
        throw new Error(`Stage with id ${id} not found`);
    }

    return result.data[0];
};