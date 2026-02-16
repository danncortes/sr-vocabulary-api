import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Create mock function that will be used in the module mock
const mockCreateSBClient = jest.fn<(token?: string) => any>();

// Mock ElevenLabs client
const mockConvertAsStream = jest.fn<(voiceId: string, options: any) => Promise<any>>();
const mockElevenLabsClient = {
    textToSpeech: {
        convertAsStream: mockConvertAsStream
    }
};

// Mock the supabaseClient module
jest.unstable_mockModule('../../../supabaseClient.js', () => ({
    createSBClient: mockCreateSBClient
}));

// Mock the elevenlabs module
jest.unstable_mockModule('elevenlabs', () => ({
    ElevenLabsClient: jest.fn().mockImplementation(() => mockElevenLabsClient)
}));

// Import handlers after mocking
const {
    getAudio,
    generateAudioPhrases,
    generateAudioFromText,
    deleteAudios
} = await import('../audio.handlers.js');

describe('getAudio Handler', () => {
    let mockSupabase: any;
    let req: any;
    let res: any;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            headers: {
                authorization: 'Bearer mock-jwt-token'
            },
            params: {
                filename: 'test-audio.mp3'
            }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
            setHeader: jest.fn().mockReturnThis()
        };

        mockSupabase = {
            storage: {
                from: jest.fn().mockReturnValue({
                    createSignedUrl: jest.fn()
                })
            }
        };

        mockCreateSBClient.mockReturnValue(mockSupabase);
    });

    it('should return signed URL for audio file successfully', async () => {
        const signedUrl = 'https://example.com/signed-audio-url';

        mockSupabase.storage.from().createSignedUrl.mockResolvedValue({
            data: { signedUrl },
            error: null
        });

        await getAudio(req, res);

        expect(mockCreateSBClient).toHaveBeenCalledWith('mock-jwt-token');
        expect(mockSupabase.storage.from).toHaveBeenCalled();
        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'audio/mpeg');
        expect(res.send).toHaveBeenCalledWith(signedUrl);
    });

    it('should handle storage errors', async () => {
        mockSupabase.storage.from().createSignedUrl.mockResolvedValue({
            data: null,
            error: { message: 'File not found' }
        });

        await getAudio(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'File not found' });
    });

    it('should handle missing authorization header', async () => {
        req.headers = {};

        mockSupabase.storage.from().createSignedUrl.mockResolvedValue({
            data: { signedUrl: 'https://example.com/url' },
            error: null
        });

        await getAudio(req, res);

        expect(mockCreateSBClient).toHaveBeenCalledWith(undefined);
    });

    it('should extract token correctly from Bearer format', async () => {
        req.headers.authorization = 'Bearer my-special-token-123';

        mockSupabase.storage.from().createSignedUrl.mockResolvedValue({
            data: { signedUrl: 'https://example.com/url' },
            error: null
        });

        await getAudio(req, res);

        expect(mockCreateSBClient).toHaveBeenCalledWith('my-special-token-123');
    });
});

describe('generateAudioFromText Handler', () => {
    let mockSupabase: any;
    let req: any;
    let res: any;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            headers: {
                authorization: 'Bearer mock-jwt-token'
            },
            body: {
                text: 'Hello world'
            }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };

        mockSupabase = {
            storage: {
                from: jest.fn().mockReturnValue({
                    upload: jest.fn()
                })
            }
        };

        mockCreateSBClient.mockReturnValue(mockSupabase);
    });

    it('should generate audio from text successfully', async () => {
        // Mock the audio stream
        const mockAudioChunks = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])];
        mockConvertAsStream.mockResolvedValue({
            [Symbol.asyncIterator]: async function* () {
                for (const chunk of mockAudioChunks) {
                    yield chunk;
                }
            }
        });

        mockSupabase.storage.from().upload.mockResolvedValue({
            data: {},
            error: null
        });

        await generateAudioFromText(req, res);

        expect(mockCreateSBClient).toHaveBeenCalledWith('mock-jwt-token');
        expect(mockConvertAsStream).toHaveBeenCalledWith(
            'IKne3meq5aSn9XLyUdCD',
            {
                text: 'Hello world',
                model_id: 'eleven_multilingual_v2'
            }
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ filename: expect.stringMatching(/^\d+\.mp3$/) });
    });

    it('should return 400 when text is missing', async () => {
        req.body = {};

        await generateAudioFromText(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Text is required' });
    });

    it('should return 400 when text is empty', async () => {
        req.body = { text: '' };

        await generateAudioFromText(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Text is required' });
    });

    it('should handle storage upload errors', async () => {
        const mockAudioChunks = [new Uint8Array([1, 2, 3])];
        mockConvertAsStream.mockResolvedValue({
            [Symbol.asyncIterator]: async function* () {
                for (const chunk of mockAudioChunks) {
                    yield chunk;
                }
            }
        });

        mockSupabase.storage.from().upload.mockResolvedValue({
            data: null,
            error: { message: 'Upload failed' }
        });

        await generateAudioFromText(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Upload failed' });
    });

    it('should handle ElevenLabs API errors', async () => {
        mockConvertAsStream.mockRejectedValue(new Error('ElevenLabs API error'));

        await generateAudioFromText(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: expect.any(Error) });
    });
});

describe('deleteAudios Handler', () => {
    let mockSupabase: any;
    let req: any;
    let res: any;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            headers: {
                authorization: 'Bearer mock-jwt-token'
            },
            body: {
                filenames: ['audio1.mp3', 'audio2.mp3']
            }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };

        mockSupabase = {
            storage: {
                from: jest.fn().mockReturnValue({
                    remove: jest.fn()
                })
            }
        };

        mockCreateSBClient.mockReturnValue(mockSupabase);
    });

    it('should delete audio files successfully', async () => {
        mockSupabase.storage.from().remove.mockResolvedValue({
            data: {},
            error: null
        });

        await deleteAudios(req, res);

        expect(mockCreateSBClient).toHaveBeenCalledWith('mock-jwt-token');
        expect(mockSupabase.storage.from().remove).toHaveBeenCalledWith(['audio1.mp3', 'audio2.mp3']);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ deleted: ['audio1.mp3', 'audio2.mp3'] });
    });

    it('should return 400 when filenames is missing', async () => {
        req.body = {};

        await deleteAudios(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Filenames array is required' });
    });

    it('should return 400 when filenames is not an array', async () => {
        req.body = { filenames: 'not-an-array' };

        await deleteAudios(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Filenames array is required' });
    });

    it('should return 400 when filenames is an empty array', async () => {
        req.body = { filenames: [] };

        await deleteAudios(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Filenames array is required' });
    });

    it('should handle storage remove errors', async () => {
        mockSupabase.storage.from().remove.mockResolvedValue({
            data: null,
            error: { message: 'Delete failed' }
        });

        await deleteAudios(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Delete failed' });
    });

    it('should handle unexpected errors', async () => {
        mockSupabase.storage.from().remove.mockRejectedValue(new Error('Unexpected error'));

        await deleteAudios(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Unexpected error' });
    });

    it('should delete a single file successfully', async () => {
        req.body = { filenames: ['single-audio.mp3'] };

        mockSupabase.storage.from().remove.mockResolvedValue({
            data: {},
            error: null
        });

        await deleteAudios(req, res);

        expect(mockSupabase.storage.from().remove).toHaveBeenCalledWith(['single-audio.mp3']);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ deleted: ['single-audio.mp3'] });
    });
});

describe('generateAudioPhrases Handler', () => {
    let mockSupabase: any;
    let req: any;
    let res: any;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            headers: {
                authorization: 'Bearer mock-jwt-token'
            }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };

        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            not: jest.fn().mockReturnThis(),
            is: jest.fn().mockReturnThis(),
            order: jest.fn(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn(),
            storage: {
                from: jest.fn().mockReturnValue({
                    upload: jest.fn()
                })
            }
        };

        mockCreateSBClient.mockReturnValue(mockSupabase);
    });

    it('should return empty array when no phrases need audio', async () => {
        mockSupabase.order.mockResolvedValue({
            data: [],
            error: null
        });

        await generateAudioPhrases(req, res);

        expect(mockCreateSBClient).toHaveBeenCalledWith('mock-jwt-token');
        expect(mockSupabase.from).toHaveBeenCalledWith('phrase_translations');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith([]);
    });

    it('should handle database query errors', async () => {
        mockSupabase.order.mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
        });

        await generateAudioPhrases(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Database error' });
    });

    it('should generate audio for phrases successfully', async () => {
        const mockPhraseData = [
            {
                id: 1,
                priority: 1,
                original: { id: 101, text: 'Hello', audio_url: null },
                translated: { id: 102, text: 'Hola', audio_url: null }
            }
        ];

        mockSupabase.order.mockResolvedValue({
            data: mockPhraseData,
            error: null
        });

        // Mock ElevenLabs audio generation
        const mockAudioChunks = [new Uint8Array([1, 2, 3])];
        mockConvertAsStream.mockResolvedValue({
            [Symbol.asyncIterator]: async function* () {
                for (const chunk of mockAudioChunks) {
                    yield chunk;
                }
            }
        });

        // Mock storage upload
        mockSupabase.storage.from().upload.mockResolvedValue({
            data: {},
            error: null
        });

        // Mock database update
        mockSupabase.eq.mockResolvedValue({
            data: {},
            error: null
        });

        await generateAudioPhrases(req, res);

        expect(mockCreateSBClient).toHaveBeenCalledWith('mock-jwt-token');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith([101, 102]);
    });

    it('should handle ElevenLabs API errors during batch generation', async () => {
        const mockPhraseData = [
            {
                id: 1,
                priority: 1,
                original: { id: 101, text: 'Hello', audio_url: null },
                translated: { id: 102, text: 'Hola', audio_url: null }
            }
        ];

        mockSupabase.order.mockResolvedValue({
            data: mockPhraseData,
            error: null
        });

        mockConvertAsStream.mockRejectedValue(new Error('ElevenLabs rate limit'));

        await generateAudioPhrases(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: expect.any(Error) });
    });

    it('should handle storage upload errors during batch generation', async () => {
        const mockPhraseData = [
            {
                id: 1,
                priority: 1,
                original: { id: 101, text: 'Hello', audio_url: null },
                translated: { id: 102, text: 'Hola', audio_url: null }
            }
        ];

        mockSupabase.order.mockResolvedValue({
            data: mockPhraseData,
            error: null
        });

        const mockAudioChunks = [new Uint8Array([1, 2, 3])];
        mockConvertAsStream.mockResolvedValue({
            [Symbol.asyncIterator]: async function* () {
                for (const chunk of mockAudioChunks) {
                    yield chunk;
                }
            }
        });

        mockSupabase.storage.from().upload.mockResolvedValue({
            data: null,
            error: { message: 'Storage quota exceeded' }
        });

        await generateAudioPhrases(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should extract token correctly from authorization header', async () => {
        req.headers.authorization = 'Bearer special-token-xyz';

        mockSupabase.order.mockResolvedValue({
            data: [],
            error: null
        });

        await generateAudioPhrases(req, res);

        expect(mockCreateSBClient).toHaveBeenCalledWith('special-token-xyz');
    });
});
