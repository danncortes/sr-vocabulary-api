import { createSBClient } from '../supabaseClient.js';

interface UserSettings {
    system_lang: { id: number; locale_code: string };
    learning_lang: { id: number; locale_code: string };
    origin_lang: { id: number; locale_code: string };
}

export const getUserFromToken = async (token: string) => {
    const supabase = createSBClient(token);

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
        throw new Error(`Failed to get user from token: ${userError.message}`);
    }

    if (!user) {
        throw new Error('User not found from token');
    }

    return user;
};

export const getUserSettings = async (token: string) => {
    const user = await getUserFromToken(token);
    const supabase = createSBClient(token);

    const result = await supabase
        .from('user_settings')
        .select(`system_lang:languages!system_lang_id(id, locale_code),
            learning_lang:languages!learning_lang_id(id, locale_code),
            origin_lang:languages!origin_lang_id(id, locale_code)`
        )
        .eq('user_id', user.id);

    if (result.error) {
        throw new Error(`Failed to fetch user settings: ${result.error.message}`);
    }

    if (!result.data || result.data.length === 0) {
        throw new Error('User settings not found');
    }

    return result.data[0] as unknown as UserSettings;
};