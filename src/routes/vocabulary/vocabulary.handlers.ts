import path from "path";
import fs, { writeFileSync } from "fs";
import { SupabaseClient } from "@supabase/supabase-js";
import { createSBClient } from "../../supabaseClient.js";
import { addDaysToDate, getNextDateByDay, getTodaysDay, isDateLessThanToday } from "../../utils/dates.js";
import {
    getVocabularyById,
    getManyVocabulary,
    delayVocabulary,
    resetVocabulary,
    restartVocabulary,
    deleteVocabulary
} from '../../services/vocabulary.service.js';
import { getStageById } from '../../services/stages.service.js';
import { getUserReviewDays } from "../../services/review-days.service.js";
import { getUserLearnDays } from "../../services/learn-days.service.js";
import { getUserFromToken, getUserSettings } from "../../services/user.service.js";

let supabaseClientTemp: SupabaseClient<any, string, any> | null

export const getAllVocabulary = async (req: any, res: any): Promise<any> => {
    try {
        const { token, user } = req;
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
            .eq('user_id', user.id)
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

export const setVocabularyReviewed = async (req: any, res: any): Promise<any> => {
    try {
        const { id } = req.body;
        const { token, user } = req;
        const supabase = createSBClient(token);

        // Now with built-in error handling
        const vocabulary = await getVocabularyById(id, token);

        const { review_date, sr_stage_id, learned: isLearned } = vocabulary;

        const newStageId = sr_stage_id + 1;
        const learned = newStageId === 6 ? 1 : isLearned;

        // Use the new stages service function with built-in error handling
        const stage = await getStageById(newStageId, token);
        const { days: daysToAdd } = stage;

        /* Normal behavior
        If New Stage is 1 and today is a learn day
        or Stage is > 1 and < 6 and today is a review day
        */
        let newReviewDate: string | null = addDaysToDate(review_date, daysToAdd);
        const todaysDay = getTodaysDay();
        const reviewDays = await getUserReviewDays(token);
        const learnDays = await getUserLearnDays(token);

        if (reviewDays.length && learnDays.length) {
            const isTodayLearnDay = learnDays.includes(todaysDay);
            const isTodayReviewDay = reviewDays.includes(todaysDay);

            if (newStageId === 1 && !isTodayLearnDay) {
                const highestLearnDay = Math.max(...learnDays);
                const nextLearnDay = getNextDateByDay(highestLearnDay);
                newReviewDate = addDaysToDate(nextLearnDay, daysToAdd);
            } else if (newStageId > 1 && newStageId < 6) {
                // The review day passed
                if (isDateLessThanToday(review_date)) {
                    if (isTodayReviewDay) {
                        newReviewDate = addDaysToDate('', daysToAdd);
                    } else {
                        const lowestReviewDay = Math.min(...reviewDays);
                        const nextReviewDate = getNextDateByDay(lowestReviewDay);
                        newReviewDate = addDaysToDate(nextReviewDate, daysToAdd);
                    }
                }
            } else if (newStageId === 6) {
                newReviewDate = null
            }

            const { data, error } = await supabase
                .from('phrase_translations')
                .update({
                    sr_stage_id: newStageId,
                    review_date: newReviewDate,
                    learned: learned
                })
                .eq('user_id', user.id)
                .eq('id', id).select();

            if (error) {
                return res.status(500).json({ error: error.message });
            }

            return res.status(200).send(data[0]);
        } else {
            return res.status(400).json({ error: reviewDays.length === 0 ? 'There are no Review Days' : 'There are no Learn Days' });
        }
    } catch (error) {
        return res.status(500).json({ error: (error as Error).message });
    }
}

export const delayManyVocabulary = async (req: any, res: any): Promise<any> => {
    try {
        const { token, user } = req;
        const supabase = createSBClient(token);
        const { ids, days } = req.body;

        const vocabulary = await getManyVocabulary(ids, token);

        if (vocabulary.error) {
            return res.status(500).json({ error: vocabulary.error.message });
        }

        const newVocabulary = [];

        for await (const item of vocabulary.data) {
            const { data, error } = await delayVocabulary({ vocabulary: item, days, userId: user.id, supabaseInstance: supabase });
            newVocabulary.push(data);

            if (error) {
                return res.status(500).json({ error: error.message });
            }
        }

        return res.status(200).send(newVocabulary);

    } catch (error) {
        return res.status(500).json({ error: error });
    }
}

export const resetManyVocabulary = async (req: any, res: any): Promise<any> => {
    try {
        const { token, user } = req;
        const supabase = createSBClient(token);
        const { ids } = req.body;

        const newVocabulary = [];

        for await (const id of ids) {
            let { data } = await resetVocabulary(id, user.id, supabase);
            newVocabulary.push(data);
        }

        return res.status(200).send(newVocabulary);
    } catch (error) {
        return res.status(500).json({ error: error });
    }
}

export const restartManyVocabulary = async (req: any, res: any): Promise<any> => {
    try {
        const { token, user } = req;
        const supabase = createSBClient(token);
        const reviewDays = await getUserReviewDays(token);

        if (!reviewDays || reviewDays.length === 0) {
            return res.status(400).json({ error: 'No review days found' });
        }

        const { ids } = req.body;
        const newVocabulary = [];
        const reviewDate = getNextDateByDay(reviewDays[0])

        for await (const id of ids) {
            let { data } = await restartVocabulary({ vocabularyId: id, userId: user.id, reviewDate, supabaseInstance: supabase });
            newVocabulary.push(data);
        }

        return res.status(200).send(newVocabulary);
    } catch (error) {
        return res.status(500).json({ error: error });
    }
}

const getFileContent = (filePath: string) => {
    return fs.readFileSync(path.join(filePath), 'utf-8');
}

const savePhrase = async (text: string, langId: number, userId: string): Promise<number> => {
    const { data, error } = await supabaseClientTemp!
        .from('phrases')
        .insert({ text, language_id: langId, user_id: userId })
        .select('id');

    if (error) {
        throw error;
    }

    console.log("🚀 ~ savePhrase ~ data:", data)
    return data[0].id;
}

type SaveVocabularyParams = {
    phraseId: number;
    translatedPhraseId: number;
    priority: number;
    userId: string;
}

const saveVocabulary = async (params: SaveVocabularyParams): Promise<number> => {
    const { phraseId, translatedPhraseId, priority, userId } = params;
    const { data, error } = await supabaseClientTemp!
        .from('phrase_translations')
        .insert({
            phrase_id: phraseId,
            translated_phrase_id: translatedPhraseId,
            priority: priority,
            modified_at: null,
            review_date: null,
            user_id: userId
        })
        .select('id');

    if (error) {
        throw error;
    }

    return data[0].id;
}

export const loadTranslatedVocabulary = async (req: any, res: any) => {
    const { token, user } = req;
    supabaseClientTemp = createSBClient(token);
    let processedPhrasesIndex = 0;

    try {
        const phrases = getTranslatedVocabulary('/Users/danncortes/danncortes vault/Deutsche Texte/NEW.md');

        processedPhrasesIndex = await processTranslatedPhrases(phrases, token, user.id);

        res.status(200).send(phrases);
    } catch (error: any) {
        if (error.processedPhrasesIndex) {
            processedPhrasesIndex = error.processedPhrasesIndex;
        }
        res.status(400).send({ error: error.message });
    } finally {
        if (processedPhrasesIndex > 0) {
            updateTranslatedVocabularyFile('/Users/danncortes/danncortes vault/Deutsche Texte/NEW.md', processedPhrasesIndex);
        }
        supabaseClientTemp = null;
    }
}

const updateTranslatedVocabularyFile = (filePath: string, linesToRemove: number) => {
    const fileContent = getFileContent(filePath);
    if (!fileContent) {
        throw new Error('File is empty or not found');
    }

    const lines = fileContent.split('\n');
    lines.splice(0, linesToRemove);
    const newContent = lines.join('\n');
    writeFileSync(filePath, newContent);
}

const getTranslatedVocabulary = (filePath: string): string[][] => {
    const fileContent = getFileContent(filePath);
    if (!fileContent) {
        throw new Error('File is empty or not found');
    }

    /**
     * The translated phrases should be in the following format
     * Every translated phrase must start with (-) and all of them before the five dashes (------):
     * 
     * -Translated Phrase 1.
     * Original phrase 1.
     * -Translated Phrase 2.
     * Original phrase 2.
     * -----
     */

    let [translatedVocabularyBlock] = fileContent.split('-----');
    const lines = translatedVocabularyBlock.split('-')
        .map(line => line.split('\n'))
        .map(line => line.filter(l => l.trim().length > 0))
        .map(line => line.map((l) => l.trim()))
        .filter(line => line.length > 0);

    return lines
}

const processTranslatedPhrases = async (phrases: string[][], token: string, userId: string): Promise<number> => {
    const userSettings = await getUserSettings(token);

    const { origin_lang_id, learning_lang_id } = userSettings;

    let processedPhrasesIndex = 0;
    try {
        for await (const [translatedPhrase, originalPhrase] of phrases) {

            console.log("🚀 Processing...", translatedPhrase);
            let [translated, priority] = translatedPhrase.split('#');
            priority = priority || '3'
            const [phraseId, translatedPhraseId] = await Promise.all([
                savePhrase(originalPhrase, origin_lang_id, userId),
                savePhrase(translated, learning_lang_id, userId)
            ])
            await saveVocabulary({ phraseId, translatedPhraseId, priority: Number(priority), userId });
            console.log("🚀 Saved...", `Original: ${originalPhrase}`, `Translated: ${translatedPhrase}`, `Priority: ${priority}`);
            processedPhrasesIndex += 2;
        }

        return processedPhrasesIndex;
        // Todo - Update the file to remove the processed phrases
    }
    catch (error) {
        console.error("Error processing phrases:", error);

        if (processedPhrasesIndex < phrases.length - 1) {
            // Todo - Update the file to remove the processed phrases
        }

        throw { error: error, processedPhrasesIndex };
    }
}

export const deleteManyVocabulary = async (req: any, res: any): Promise<any> => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        const supabase = createSBClient(token);
        const { id: userId } = await getUserFromToken(token);
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'No vocabulary IDs provided' });
        }

        const deletedIds: number[] = [];

        for await (const id of ids) {
            const { data, error } = await deleteVocabulary(id, userId, supabase);
            if (error) {
                return res.status(500).json({ error });
            }
            deletedIds.push(data);
        }

        return res.status(200).send(deletedIds);
    } catch (error) {
        return res.status(500).json({ error: error });
    }
}