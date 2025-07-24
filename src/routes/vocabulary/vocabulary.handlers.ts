import path from "path";
import fs from "fs";
import { SupabaseClient } from "@supabase/supabase-js";
import { createSBClient } from "../../superbaseClient.js";
import { addDaysToDate, getNextDateByDay, getTodaysDay, isDateLessThanToday } from "../../utils/dates.js";

let supabaseClientTemp: SupabaseClient<any, string, any> | null

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

        if (newStageId === 1 && !['Monday', 'Tuesday'].includes(todaysDay)) {
            const nextLearnDay = getNextDateByDay('Tuesday');
            newReviewDate = addDaysToDate(nextLearnDay, days);
        } else if (newStageId > 1 && newStageId < 6) {
            if (isDateLessThanToday(review_date)) {
                if (['Wednesday', 'Thursday'].includes(todaysDay)) {
                    newReviewDate = addDaysToDate('', days);
                } else {
                    const nextReviewDate = getNextDateByDay('Wednesday');
                    newReviewDate = addDaysToDate(nextReviewDate, days);
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
            .eq('id', id).select();

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).send(data[0]);

    } catch (error) {
        return res.status(500).json({ error: error });
    }
}

const getManyVocabulary = (ids: number[], token: string) => {
    const supabase = createSBClient(token);
    return supabase
        .from('phrase_translations')
        .select('*')
        .in('id', ids);
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

export const loadTranslatedVocabulary = async (req: any, res: any) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    supabaseClientTemp = createSBClient(token);

    try {
        const phrases = getTranslatedVocabulary('/Users/danncortes/danncortes vault/Deutsche Texte/NEW.md');

        await processTranslatedPhrases(phrases);

        res.status(200).send(phrases);
        supabaseClientTemp = null;
    } catch (error: any) {
        res.status(400).send({ error: error.message });
    }
}

const getTranslatedVocabulary = (filePath: string): string[][] => {
    const fileContent = getFileContent(filePath);
    if (!fileContent) {
        throw new Error('File is empty or not found');
    }

    let [translatedVocabularyBlock] = fileContent.split('-----');
    const lines = translatedVocabularyBlock.split('-')
        .map(line => line.trim())
        .map(line => line.split('\n'))
        .filter(line => {
            return line.length > 1
        });

    return lines
}

const processTranslatedPhrases = async (phrases: string[][]): Promise<void> => {
    let processedPhrasesIndex = 0;
    try {
        for await (const [originalPhrase, translatedPhrase] of phrases) {

            console.log("🚀 Processing...", originalPhrase);
            let [original, priority] = originalPhrase.split('#');
            priority = priority || '3'
            const [phraseId, translatedPhraseId] = await Promise.all([
                savePhrase(original, 3),
                savePhrase(translatedPhrase, 4)
            ])
            await saveVocabulary(phraseId, translatedPhraseId, Number(priority));
            console.log("🚀 Saved...", `Original: ${originalPhrase}`, `Translated: ${translatedPhrase}`, `Priority: ${priority}`);
            processedPhrasesIndex++;
        }
        // Todo - Update the file to remove the processed phrases
    }
    catch (error) {
        console.error("Error processing phrases:", error);

        if (processedPhrasesIndex < phrases.length - 1) {
            // Todo - Update the file to remove the processed phrases
        }

        throw error;
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

const translatePhrase = async (phrase: string, langFrom: string, langTo: string): Promise<void> => {

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