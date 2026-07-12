import * as deepl from 'deepl-node';

const { DEEPL_API_KEY } = process.env;

const translator = new deepl.Translator(DEEPL_API_KEY as string);

export const translatePhrase = async (req: any, res: any) => {
    try {
        const { phrase, sourceLanguage, targetLanguage } = req.body;

        if (!phrase || !sourceLanguage || !targetLanguage) {
            return res.status(400).json({
                error: 'Missing required fields: phrase, sourceLanguage, targetLanguage'
            });
        }

        const result = await translator.translateText(
            phrase,
            sourceLanguage as deepl.SourceLanguageCode,
            targetLanguage as deepl.TargetLanguageCode
        );

        const translatedPhrase = Array.isArray(result) ? result[0].text : result.text;

        return res.status(200).json({ translatedPhrase });
    } catch (error: any) {
        console.error('Translation error:', error);
        return res.status(500).json({ error: error.message || 'Translation failed' });
    }
};
