import { createSBClient } from "../../superbaseClient.js";
import { ElevenLabsClient } from 'elevenlabs';
const { EVENLABS_API_KEY } = process.env;

const evenlabsClient = new ElevenLabsClient({
    apiKey: EVENLABS_API_KEY
});

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

const generateSpeech = async (text: string): Promise<ArrayBuffer> => {
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

const saveAudio = async (audio: Buffer, id: number, token: string) => {
    const bucket = process.env.SUPABASE_BUCKET || '';

    try {
        const audioName = `${id}.mp3`;

        const supabase = createSBClient(token);
        const { error } = await supabase.storage
            .from(bucket)
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
        const token = req.headers.authorization?.replace('Bearer ', '');
        const supabase = createSBClient(token);

        const { data, error } = await supabase
            .from('phrases')
            .select(`
                id,
                text,
                audio_url
            `).is('audio_url', null);

        const savedAudios = []

        for await (const phrase of data!) {
            const audio = await generateSpeech(phrase.text);
            const audioBuffer = Buffer.from(audio);
            await saveAudio(audioBuffer, phrase.id, token);

            const { error } = await supabase
                .from('phrases')
                .update({
                    audio_url: `${phrase.id}.mp3`
                })
                .eq('id', phrase.id);

            savedAudios.push(phrase.id);

            if (error) {
                throw error.message;
            }

        }

        if (error) {
            throw error.message;
        }
        return res.status(200).send(savedAudios);
    } catch (error) {
        return res.status(500).json({ error: error });
    }
}