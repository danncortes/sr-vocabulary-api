import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import type { RequestHandler } from 'express';

// Create mock functions
const mockTranslatePhrase = jest.fn() as jest.MockedFunction<RequestHandler>;
const mockAuthenticateToken = jest.fn() as jest.MockedFunction<RequestHandler>;

// Mock the handlers module
jest.unstable_mockModule('../translate.handlers.js', () => ({
    translatePhrase: mockTranslatePhrase
}));

// Mock the auth middleware
jest.unstable_mockModule('../../../middleware/auth.js', () => ({
    authenticateToken: mockAuthenticateToken,
}));

// Import router after mocking
const { default: router } = await import('../translate.routes.js');

describe('Translate Routes', () => {
    let app: express.Application;
    const validToken = 'Bearer valid-token-123';

    beforeEach(() => {
        jest.clearAllMocks();

        app = express();
        app.use(express.json());
        app.use('/translate', router);

        // Default auth mock - successful authentication
        mockAuthenticateToken.mockImplementation((req: any, _res, next) => {
            req.token = 'valid-token-123';
            req.user = { id: 'user-123', email: 'test@example.com' };
            next();
        });

        // Default handler mock
        mockTranslatePhrase.mockImplementation((_req, res) => {
            res.status(200).json({ translatedPhrase: 'translated text' });
        });
    });

    describe('Authentication', () => {
        it('should return 401 when no token provided and not call handler', async () => {
            mockAuthenticateToken.mockImplementation((_req, res) => {
                res.status(401).json({ error: 'Unauthorized' });
            });

            const response = await request(app)
                .post('/translate')
                .send({ phrase: 'hello', sourceLanguage: 'en', targetLanguage: 'es' })
                .expect(401);

            expect(response.body.error).toBe('Unauthorized');
            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockTranslatePhrase).not.toHaveBeenCalled();
        });

        it('should return 401 when token is invalid and not call handler', async () => {
            mockAuthenticateToken.mockImplementation((_req, res) => {
                res.status(401).json({ error: 'Invalid or missing token' });
            });

            const response = await request(app)
                .post('/translate')
                .set('Authorization', 'Bearer invalid-token')
                .send({ phrase: 'hello', sourceLanguage: 'en', targetLanguage: 'es' })
                .expect(401);

            expect(response.body.error).toBe('Invalid or missing token');
            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockTranslatePhrase).not.toHaveBeenCalled();
        });

        it('should return 401 with expired message when token is expired', async () => {
            mockAuthenticateToken.mockImplementation((_req, res) => {
                res.status(401).json({ error: 'Unauthorized: token expired' });
            });

            const response = await request(app)
                .post('/translate')
                .set('Authorization', 'Bearer expired-token')
                .send({ phrase: 'hello', sourceLanguage: 'en', targetLanguage: 'es' })
                .expect(401);

            expect(response.body.error).toBe('Unauthorized: token expired');
            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockTranslatePhrase).not.toHaveBeenCalled();
        });

        it('should pass token and user to handler on successful authentication', async () => {
            const testToken = 'test-token-456';
            const testUser = { id: 'user-456', email: 'user@test.com' };

            mockAuthenticateToken.mockImplementation((req: any, _res, next) => {
                req.token = testToken;
                req.user = testUser;
                next();
            });

            mockTranslatePhrase.mockImplementation((req: any, res) => {
                expect(req.token).toBe(testToken);
                expect(req.user).toEqual(testUser);
                res.status(200).json({ translatedPhrase: 'hola', token: req.token, user: req.user });
            });

            const response = await request(app)
                .post('/translate')
                .set('Authorization', `Bearer ${testToken}`)
                .send({ phrase: 'hello', sourceLanguage: 'en', targetLanguage: 'es' })
                .expect(200);

            expect(response.body.token).toBe(testToken);
            expect(response.body.user).toEqual(testUser);
            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockTranslatePhrase).toHaveBeenCalledTimes(1);
        });
    });

    describe('HTTP Methods', () => {
        it('should only accept POST requests, reject all other methods', async () => {
            const methods = [
                { method: 'get', expectedStatus: 404, shouldCallHandler: false },
                { method: 'put', expectedStatus: 404, shouldCallHandler: false },
                { method: 'delete', expectedStatus: 404, shouldCallHandler: false },
                { method: 'patch', expectedStatus: 404, shouldCallHandler: false },
                { method: 'post', expectedStatus: 200, shouldCallHandler: true },
            ];

            for (const { method, expectedStatus, shouldCallHandler } of methods) {
                jest.clearAllMocks();

                const req = (request(app) as any)[method]('/translate')
                    .set('Authorization', validToken);

                if (['post', 'put', 'patch'].includes(method)) {
                    req.send({ phrase: 'hello', sourceLanguage: 'en', targetLanguage: 'es' });
                }

                await req.expect(expectedStatus);

                if (shouldCallHandler) {
                    expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
                    expect(mockTranslatePhrase).toHaveBeenCalledTimes(1);
                } else {
                    expect(mockTranslatePhrase).not.toHaveBeenCalled();
                }
            }
        });
    });

    describe('Request Handling', () => {
        it('should parse JSON body, pass to handler, and return JSON response', async () => {
            const requestBody = {
                phrase: 'hello world',
                sourceLanguage: 'en',
                targetLanguage: 'de'
            };

            mockTranslatePhrase.mockImplementation((req: any, res) => {
                // Verify body is parsed correctly
                expect(req.body).toEqual(requestBody);
                expect(req.body.phrase).toBe('hello world');
                expect(req.body.sourceLanguage).toBe('en');
                expect(req.body.targetLanguage).toBe('de');
                res.status(200).json({ translatedPhrase: 'hallo welt' });
            });

            const response = await request(app)
                .post('/translate')
                .set('Authorization', validToken)
                .send(requestBody)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('translatedPhrase');
            expect(response.body.translatedPhrase).toBe('hallo welt');
            expect(mockTranslatePhrase).toHaveBeenCalledTimes(1);
        });
    });

    describe('Error Responses', () => {
        it('should handle empty body with 400 error', async () => {
            mockTranslatePhrase.mockImplementation((_req, res) => {
                res.status(400).json({
                    error: 'Missing required fields: phrase, sourceLanguage, targetLanguage'
                });
            });

            const response = await request(app)
                .post('/translate')
                .set('Authorization', validToken)
                .send({})
                .expect(400);

            expect(response.body.error).toBe('Missing required fields: phrase, sourceLanguage, targetLanguage');
        });

        it('should handle handler errors with 500 status', async () => {
            mockTranslatePhrase.mockImplementation((_req, res) => {
                res.status(500).json({ error: 'Translation service unavailable' });
            });

            const response = await request(app)
                .post('/translate')
                .set('Authorization', validToken)
                .send({ phrase: 'hello', sourceLanguage: 'en', targetLanguage: 'es' })
                .expect(500);

            expect(response.body).toEqual({ error: 'Translation service unavailable' });
        });
    });
});
