import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Create mock translator instance
const mockTranslateText = jest.fn<(phrase: string, source: string, target: string) => Promise<{ text: string } | { text: string }[]>>();

// Mock the deepl-node module
jest.unstable_mockModule('deepl-node', () => ({
    Translator: jest.fn().mockImplementation(() => ({
        translateText: mockTranslateText
    }))
}));

// Import the handlers after mocking
const { translatePhrase } = await import('../translate.handlers.js');

describe('translatePhrase Handler', () => {
    let req: any;
    let res: any;
    const originalConsoleError = console.error;

    beforeEach(() => {
        jest.clearAllMocks();
        console.error = jest.fn();

        req = {
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    afterAll(() => {
        console.error = originalConsoleError;
    });

    describe('validation', () => {
        it('should return 400 when phrase is missing', async () => {
            req.body = {
                sourceLanguage: 'en',
                targetLanguage: 'es'
            };

            await translatePhrase(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Missing required fields: phrase, sourceLanguage, targetLanguage'
            });
        });

        it('should return 400 when sourceLanguage is missing', async () => {
            req.body = {
                phrase: 'hello',
                targetLanguage: 'es'
            };

            await translatePhrase(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Missing required fields: phrase, sourceLanguage, targetLanguage'
            });
        });

        it('should return 400 when targetLanguage is missing', async () => {
            req.body = {
                phrase: 'hello',
                sourceLanguage: 'en'
            };

            await translatePhrase(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Missing required fields: phrase, sourceLanguage, targetLanguage'
            });
        });

        it('should return 400 when all fields are missing', async () => {
            req.body = {};

            await translatePhrase(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Missing required fields: phrase, sourceLanguage, targetLanguage'
            });
        });

        it('should return 400 when phrase is empty string', async () => {
            req.body = {
                phrase: '',
                sourceLanguage: 'en',
                targetLanguage: 'es'
            };

            await translatePhrase(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Missing required fields: phrase, sourceLanguage, targetLanguage'
            });
        });

        it('should return 400 when fields are null', async () => {
            req.body = {
                phrase: null,
                sourceLanguage: null,
                targetLanguage: null
            };

            await translatePhrase(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Missing required fields: phrase, sourceLanguage, targetLanguage'
            });
        });

        it('should pass numbers to translator (no type validation)', async () => {
            req.body = {
                phrase: 12345,
                sourceLanguage: 'en',
                targetLanguage: 'es'
            };
            mockTranslateText.mockResolvedValueOnce({ text: '12345' });

            await translatePhrase(req, res);

            expect(mockTranslateText).toHaveBeenCalledTimes(1);
            expect(mockTranslateText.mock.calls[0][0]).toBe(12345);
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('successful translation', () => {
        it('should return translated phrase with status 200', async () => {
            req.body = {
                phrase: 'hello',
                sourceLanguage: 'en',
                targetLanguage: 'es'
            };
            mockTranslateText.mockResolvedValueOnce({ text: 'hola' });

            await translatePhrase(req, res);

            expect(mockTranslateText).toHaveBeenCalledWith('hello', 'en', 'es');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ translatedPhrase: 'hola' });
        });

        it('should handle array response from translator', async () => {
            req.body = {
                phrase: 'hello world',
                sourceLanguage: 'en',
                targetLanguage: 'de'
            };
            mockTranslateText.mockResolvedValueOnce([{ text: 'hallo welt' }]);

            await translatePhrase(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ translatedPhrase: 'hallo welt' });
        });

        it('should pass correct language codes to translator', async () => {
            req.body = {
                phrase: 'goodbye',
                sourceLanguage: 'en',
                targetLanguage: 'fr'
            };
            mockTranslateText.mockResolvedValueOnce({ text: 'au revoir' });

            await translatePhrase(req, res);

            expect(mockTranslateText).toHaveBeenCalledWith('goodbye', 'en', 'fr');
        });
    });

    describe('error handling', () => {
        it('should return 500 when translation fails', async () => {
            req.body = {
                phrase: 'hello',
                sourceLanguage: 'en',
                targetLanguage: 'es'
            };
            mockTranslateText.mockRejectedValueOnce(new Error('Translation API error'));

            await translatePhrase(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Translation API error' });
        });

        it('should return generic error message when error has no message', async () => {
            req.body = {
                phrase: 'hello',
                sourceLanguage: 'en',
                targetLanguage: 'es'
            };
            mockTranslateText.mockRejectedValueOnce({});

            await translatePhrase(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Translation failed' });
        });

        it('should handle network errors', async () => {
            req.body = {
                phrase: 'hello',
                sourceLanguage: 'en',
                targetLanguage: 'es'
            };
            mockTranslateText.mockRejectedValueOnce(new Error('Network error'));

            await translatePhrase(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Network error' });
        });

        it('should handle quota exceeded errors', async () => {
            req.body = {
                phrase: 'hello',
                sourceLanguage: 'en',
                targetLanguage: 'es'
            };
            mockTranslateText.mockRejectedValueOnce(new Error('Quota exceeded'));

            await translatePhrase(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Quota exceeded' });
        });

        it('should handle invalid language codes', async () => {
            req.body = {
                phrase: 'hello',
                sourceLanguage: 'invalid',
                targetLanguage: 'xyz'
            };
            mockTranslateText.mockRejectedValueOnce(new Error('Invalid language code'));

            await translatePhrase(req, res);

            expect(mockTranslateText).toHaveBeenCalledWith('hello', 'invalid', 'xyz');
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Invalid language code' });
        });
    });
});
