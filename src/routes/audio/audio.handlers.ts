import { createSBClient } from "../../superbaseClient.js";

export const getAudio = async (req: any, res: any) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const supabase = createSBClient(token);
    const bucket = process.env.SUPABASE_BUCKET || '';
    const { filename } = req.params;

    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filename, 60);
    console.log("🚀 ~ getAudio ~ data:", data)

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(data.signedUrl);
}