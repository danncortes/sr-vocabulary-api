import path from "path";
import fs, { writeFileSync } from "fs";
import { SupabaseClient } from "@supabase/supabase-js";
import { createSBClient } from "../../supabaseClient.js";
import { addDaysToDate, getNextDateByDay, getTodaysDay, isDateLessThanToday } from "../../utils/dates.js";
import { getVocabularyById } from '../../services/vocabulary.service.js';
import { getStageById } from '../../services/stages.service.js';
import { getUserReviewDays } from "../../services/review-days.service.js";
import { getUserLearnDays } from "../../services/learn-days.service.js";
import { getUserFromToken } from "../../services/user.service.js";

let supabaseClientTemp: SupabaseClient<any, string, any> | null

export const getAllVocabulary = async (req: any, res: any): Promise<any> => {
    try {
        const token = req.token;
        const user = await getUserFromToken(token);
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
        const { token } = req;
        const supabase = createSBClient(token);
        const user = await getUserFromToken(token);

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

export const delayVocabulary = async (item: any, days: number, supabase: SupabaseClient<any, string, any>): Promise<any> => {
    const { review_date } = item;
    const newReviewDate = addDaysToDate(review_date, days);
    const { data, error } = await supabase
        .from('phrase_translations')
        .update({
            review_date: newReviewDate
        })
        .eq('id', item.id);

    if (error) {
        return { error: error.message };
    }
    return { data: { ...item, review_date: newReviewDate } }
}

const getManyVocabulary = (ids: number[], token: string) => {
    const supabase = createSBClient(token);
    return supabase
        .from('phrase_translations')
        .select('*')
        .in('id', ids);
}

export const delayManyVocabulary = async (req: any, res: any): Promise<any> => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        const supabase = createSBClient(token);
        const { ids, days } = req.body;

        const vocabulary = await getManyVocabulary(ids, token);

        if (vocabulary.error) {
            return res.status(500).json({ error: vocabulary.error.message });
        }

        const newVocabulary = [];

        for await (const item of vocabulary.data) {
            const { data, error } = await delayVocabulary(item, days, supabase);
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
        const token = req.headers.authorization?.replace('Bearer ', '');
        const supabase = createSBClient(token);
        const { ids } = req.body;

        const newVocabulary = [];

        for await (const id of ids) {
            let { data } = await resetVocabulary(id, supabase);
            newVocabulary.push(data);
        }

        return res.status(200).send(newVocabulary);
    } catch (error) {
        return res.status(500).json({ error: error });
    }
}

export const resetVocabulary = async (id: number, supabase: SupabaseClient<any, string, any>): Promise<any> => {
    const { data, error } = await supabase
        .from('phrase_translations')
        .update({
            sr_stage_id: 0,
            review_date: null,
            learned: 0
        })
        .eq('id', id).select();

    if (error) {
        return { error: error.message };
    }
    return { data: data[0] }
}

export const restartManyVocabulary = async (req: any, res: any): Promise<any> => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        const supabase = createSBClient(token);
        const { ids } = req.body;

        const newVocabulary = [];

        for await (const id of ids) {
            let { data } = await restartVocabulary(id, supabase);
            newVocabulary.push(data);
        }

        return res.status(200).send(newVocabulary);
    } catch (error) {
        return res.status(500).json({ error: error });
    }
}

export const restartVocabulary = async (id: number, supabase: SupabaseClient<any, string, any>): Promise<any> => {

    // TODO - Replace 3 with the lowest review day from the user settings.
    const lowestReviewDay = 3;

    const { data, error } = await supabase
        .from('phrase_translations')
        .update({
            sr_stage_id: 1,
            review_date: getNextDateByDay(lowestReviewDay),
            learned: 0
        })
        .eq('id', id).select();

    if (error) {
        return { error: error.message };
    }
    return { data: data[0] }
}

export const loadTranslatedVocabulary = async (req: any, res: any) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    supabaseClientTemp = createSBClient(token);
    let processedPhrasesIndex = 0;

    try {
        const phrases = getTranslatedVocabulary('/Users/danncortes/danncortes vault/Deutsche Texte/NEW.md');

        processedPhrasesIndex = await processTranslatedPhrases(phrases);

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

    let [translatedVocabularyBlock] = fileContent.split('-----');
    const lines = translatedVocabularyBlock.split('-')
        .map(line => line.split('\n'))
        .map(line => line.filter(l => l.trim().length > 0))
        .map(line => line.map((l) => l.trim()))
        .filter(line => line.length > 0);

    return lines
}

const processTranslatedPhrases = async (phrases: string[][]): Promise<number> => {
    let processedPhrasesIndex = 0;
    try {
        for await (const [translatedPhrase, originalPhrase] of phrases) {

            console.log("🚀 Processing...", translatedPhrase);
            let [translated, priority] = translatedPhrase.split('#');
            priority = priority || '3'
            const [phraseId, translatedPhraseId] = await Promise.all([
                savePhrase(originalPhrase, 3),
                savePhrase(translated, 4)
            ])
            await saveVocabulary(phraseId, translatedPhraseId, Number(priority));
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

export const loadRawVocabulary = async (req: any, res: any) => {
    try {
        const phrases = getRawVocabulary('/Users/danncortes/danncortes vault/Deutsche Texte/NEW.md');
        await processPhrases(phrases);
        res.status(200).send(phrases);
    } catch (error: any) {
        console.log("🚀 ~ loadNewVocabulary ~ error:", error);
        res.status(400).send({ error: error.message });
    }
}

const getFileContent = (filePath: string) => {
    return fs.readFileSync(path.join(filePath), 'utf-8');
}

const getRawVocabulary = (filePath: string): [string, number][] => {
    const fileContent = getFileContent(filePath);
    if (!fileContent) {
        throw new Error('File is empty or not found');
    }

    //Todo - Update
    const lines: [string, number][] = fileContent.split('\n').map(line => {
        line.trim();
        let [phrase, priority] = line.split('#');
        priority = priority || '3';
        return [phrase, Number(priority)] as [string, number];
    }).filter(line => {
        const [phrase, priority] = line;
        return phrase.length > 0;
    });

    return lines
}

const processPhrases = async (phrases: [string, number][]): Promise<void> => {
    try {
        for await (const [originalPhrase, priority] of phrases) {
            console.log("🚀 Processing...", originalPhrase);
        }
    }
    catch (error) {
        console.error("Error processing phrases:", error);
        throw error;
    }
}

const savePhrase = async (text: string, langId: number): Promise<number> => {
    const { data, error } = await supabaseClientTemp!
        .from('phrases')
        .insert({ text, language_id: langId })
        .select('id');

    if (error) {
        throw error;
    }

    console.log("🚀 ~ savePhrase ~ data:", data)
    return data[0].id;
}

const saveVocabulary = async (phraseIdFrom: number, phraseIdTo: number, priority: number): Promise<number> => {
    const { data, error } = await supabaseClientTemp!
        .from('phrase_translations')
        .insert({
            phrase_id: phraseIdFrom,
            translated_phrase_id: phraseIdTo,
            priority,
            modified_at: null,
            review_date: null
        })
        .select('id');

    if (error) {
        throw error;
    }

    return data[0].id;
}