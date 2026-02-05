import { SupabaseClient } from "@supabase/supabase-js";
import { createSBClient } from "../../supabaseClient.js";
import { ElevenLabsClient } from 'elevenlabs';
const { EVENLABS_API_KEY } = process.env;

const evenlabsClient = new ElevenLabsClient({
    apiKey: EVENLABS_API_KEY
});

let supabaseTempClient: SupabaseClient<any, string, any> | null = null;
let tempToken = '';

interface PhraseTranslationsResponse {
    data: {
        id: number;
        priority: number;
        original: {
            id: number;
            text: string;
            audio_url: string;
        };
        translated: {
            id: number;
            text: string;
            audio_url: string;
        };
    }[] | null,
    error: {
        message: string;
    }
}

export const getAudio = async (req: any, res: any) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const supabase = createSBClient(token);
    const bucket = process.env.SUPABASE_BUCKET || '';
    const { filename } = req.params;

    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filename, 60);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(data.signedUrl);
}

const generateAndSaveAudio = async (text: string, id: number): Promise<number> => {
    const audio = await generateSpeech(text);
    const audioBuffer = Buffer.from(audio);
    await saveAudio(audioBuffer, id);

    const { error } = await supabaseTempClient!
        .from('phrases')
        .update({
            audio_url: `${id}.mp3`
        })
        .eq('id', id);

    if (error) {
        throw error.message;
    }

    console.log(`Audio for: ${text} - saved with id: ${id}`)

    return id
}

const generateSpeech = async (text: string): Promise<Buffer> => {
    try {
        const audio = await evenlabsClient.textToSpeech.convertAsStream(
            'IKne3meq5aSn9XLyUdCD',
            {
                text,
                model_id: 'eleven_multilingual_v2'
            }
        );

        // Collect all chunks into a buffer
        const chunks: Uint8Array[] = [];
        for await (const chunk of audio) {
            chunks.push(chunk);
        }
        const audioBuffer = Buffer.concat(chunks);

        return audioBuffer;
        // Play the audio buffer using playMp3
    } catch (error) {
        console.error('Error generating speech:', error);
        throw error;
    }
}

const saveAudio = async (audio: Buffer, id: number, bucketName: string = process.env.SUPABASE_BUCKET || '') => {

    try {
        const audioName = `${id}.mp3`;

        const { error } = await supabaseTempClient!.storage
            .from(bucketName)
            .upload(audioName, audio, {
                contentType: 'audio/mp3',
                upsert: true
            });

        if (error) {
            throw error.message;
        }

        return id;
    } catch (error) {
        throw new Error(`Error uploading audio ${id}: ${error}`);
    }
};

export const generateAudioPhrases = async (req: any, res: any) => {
    try {
        tempToken = req.headers.authorization?.replace('Bearer ', '');
        supabaseTempClient = createSBClient(tempToken);

        const { data, error } = await supabaseTempClient
            .from('phrase_translations')
            .select(`
            id,
            priority,
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
            .is('original.audio_url', null)
            .is('translated.audio_url', null)
            .order('priority', { ascending: true }) as PhraseTranslationsResponse

        const savedAudios = []

        console.log("🚀 ~ generateAudioPhrases ~ data:", data![1])
        if (data) {
            for await (const phrase of data) {
                const { original, translated } = phrase;

                const [originalAudioId, translatedAudioId] = await Promise.all([
                    generateAndSaveAudio(original.text, original.id),
                    generateAndSaveAudio(translated.text, translated.id),
                ])

                savedAudios.push(originalAudioId, translatedAudioId);
            }
        }

        if (error) {
            throw error.message;
        }

        supabaseTempClient = null;
        tempToken = '';
        return res.status(200).send(savedAudios);
    } catch (error) {
        return res.status(500).json({ error: error });
    }
}

const generateAudio = async (text: string, supabase: SupabaseClient<any, string, any>): Promise<string> => {
    const timestamp = Date.now();
    const filename = `${timestamp}.mp3`;

    const audio = await generateSpeech(text);
    const audioBuffer = Buffer.from(audio);

    const bucket = process.env.SUPABASE_BUCKET || '';
    const { error } = await supabase.storage
        .from(bucket)
        .upload(filename, audioBuffer, {
            contentType: 'audio/mp3',
            upsert: true
        });

    if (error) {
        throw error.message;
    }

    console.log(`Audio for: ${text} - saved as: ${filename}`)

    return filename;
}

export const generateAudioFromText = async (req: any, res: any) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        const supabase = createSBClient(token);
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const filename = await generateAudio(text, supabase);

        return res.status(200).json({ filename });
    } catch (error) {
        return res.status(500).json({ error: error });
    }
}

export const deleteAudios = async (req: any, res: any) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        const supabase = createSBClient(token);
        const { filenames } = req.body;

        if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
            return res.status(400).json({ error: 'Filenames array is required' });
        }

        const bucket = process.env.SUPABASE_BUCKET || '';
        const { error } = await supabase.storage
            .from(bucket)
            .remove(filenames);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({ deleted: filenames });
    } catch (error: any) {
        return res.status(500).json({ error: error.message || error });
    }
}