import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import type { RequestHandler } from 'express';

// Create mock functions
const mockGetAudio = jest.fn() as jest.MockedFunction<RequestHandler>;
const mockGenerateAudioPhrases = jest.fn() as jest.MockedFunction<RequestHandler>;
const mockGenerateAudioFromText = jest.fn() as jest.MockedFunction<RequestHandler>;
const mockDeleteAudios = jest.fn() as jest.MockedFunction<RequestHandler>;

// Mock the authentication middleware
const mockAuthenticateToken = jest.fn() as jest.MockedFunction<RequestHandler>;

// Mock using unstable_mockModule for ES modules
jest.unstable_mockModule('../audio.handlers.js', () => ({
    getAudio: mockGetAudio,
    generateAudioPhrases: mockGenerateAudioPhrases,
    generateAudioFromText: mockGenerateAudioFromText,
    deleteAudios: mockDeleteAudios,
}));

// Mock the auth middleware
jest.unstable_mockModule('../../../middleware/auth.js', () => ({
    authenticateToken: mockAuthenticateToken,
}));

// Import router after mocking
const { default: router } = await import('../audio.routes.js');

describe('Audio Routes', () => {
    let app: express.Application;
    const validToken = 'Bearer valid-token-123';

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        // Create Express app and use the router
        app = express();
        app.use(express.json());
        app.use('/audio', router);

        // Setup auth middleware mock to simulate successful authentication
        mockAuthenticateToken.mockImplementation((req: any, res, next) => {
            req.token = 'valid-token-123';
            req.user = { id: 'user-123' };
            next();
        });

        // Setup default mock implementations that respond successfully
        mockGetAudio.mockImplementation((req, res) => {
            res.status(200).json({ message: 'getAudio called' });
        });

        mockGenerateAudioPhrases.mockImplementation((req, res) => {
            res.status(200).json({ message: 'generateAudioPhrases called' });
        });

        mockGenerateAudioFromText.mockImplementation((req, res) => {
            res.status(200).json({ message: 'generateAudioFromText called' });
        });

        mockDeleteAudios.mockImplementation((req, res) => {
            res.status(200).json({ message: 'deleteAudios called' });
        });
    });

    describe('Route Handler Mapping with Authentication', () => {
        it('should call generateAudioPhrases handler for GET /generate-audios with valid token', async () => {
            await request(app)
                .get('/audio/generate-audios')
                .set('Authorization', validToken)
                .expect(200);

            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockGenerateAudioPhrases).toHaveBeenCalledTimes(1);
        });

        it('should call generateAudioFromText handler for POST /generate with valid token', async () => {
            await request(app)
                .post('/audio/generate')
                .set('Authorization', validToken)
                .send({ text: 'Hello world' })
                .expect(200);

            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockGenerateAudioFromText).toHaveBeenCalledTimes(1);
        });

        it('should call deleteAudios handler for POST /delete with valid token', async () => {
            await request(app)
                .post('/audio/delete')
                .set('Authorization', validToken)
                .send({ filenames: ['file1.mp3', 'file2.mp3'] })
                .expect(200);

            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockDeleteAudios).toHaveBeenCalledTimes(1);
        });

        it('should call getAudio handler for GET /:filename with valid token', async () => {
            await request(app)
                .get('/audio/test-file.mp3')
                .set('Authorization', validToken)
                .expect(200);

            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockGetAudio).toHaveBeenCalledTimes(1);
        });
    });

    describe('Authentication Middleware Tests', () => {
        it('should call authentication middleware for all routes', async () => {
            const routes = [
                { method: 'get', path: '/audio/generate-audios' },
                { method: 'post', path: '/audio/generate' },
                { method: 'post', path: '/audio/delete' },
                { method: 'get', path: '/audio/test-file.mp3' },
            ];

            for (const route of routes) {
                jest.clearAllMocks();

                const req = (request(app) as any)[route.method](route.path)
                    .set('Authorization', validToken);

                if (route.method === 'post') {
                    req.send({});
                }

                await req.expect(200);
                expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            }
        });

        it('should handle authentication failure', async () => {
            mockAuthenticateToken.mockImplementation((req, res) => {
                res.status(401).json({ error: 'Unauthorized' });
            });

            await request(app)
                .get('/audio/generate-audios')
                .expect(401);

            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockGenerateAudioPhrases).not.toHaveBeenCalled();
        });

        it('should not call handlers when authentication fails for POST /generate', async () => {
            mockAuthenticateToken.mockImplementation((req, res) => {
                res.status(401).json({ error: 'Unauthorized' });
            });

            await request(app)
                .post('/audio/generate')
                .send({ text: 'Hello world' })
                .expect(401);

            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockGenerateAudioFromText).not.toHaveBeenCalled();
        });

        it('should not call handlers when authentication fails for POST /delete', async () => {
            mockAuthenticateToken.mockImplementation((req, res) => {
                res.status(401).json({ error: 'Unauthorized' });
            });

            await request(app)
                .post('/audio/delete')
                .send({ filenames: ['file.mp3'] })
                .expect(401);

            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockDeleteAudios).not.toHaveBeenCalled();
        });

        it('should not call handlers when authentication fails for GET /:filename', async () => {
            mockAuthenticateToken.mockImplementation((req, res) => {
                res.status(401).json({ error: 'Unauthorized' });
            });

            await request(app)
                .get('/audio/test-file.mp3')
                .expect(401);

            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockGetAudio).not.toHaveBeenCalled();
        });
    });

    describe('Route Coverage', () => {
        it('should have all handlers called exactly once when all routes are hit with authentication', async () => {
            await request(app).get('/audio/generate-audios').set('Authorization', validToken);
            await request(app).post('/audio/generate').set('Authorization', validToken).send({ text: 'test' });
            await request(app).post('/audio/delete').set('Authorization', validToken).send({ filenames: ['f.mp3'] });
            await request(app).get('/audio/test.mp3').set('Authorization', validToken);

            expect(mockGenerateAudioPhrases).toHaveBeenCalledTimes(1);
            expect(mockGenerateAudioFromText).toHaveBeenCalledTimes(1);
            expect(mockDeleteAudios).toHaveBeenCalledTimes(1);
            expect(mockGetAudio).toHaveBeenCalledTimes(1);

            expect(mockAuthenticateToken).toHaveBeenCalledTimes(4);
        });
    });

    describe('Token Extraction', () => {
        it('should pass extracted token and user to handlers', async () => {
            const testToken = 'test-token-456';
            const testUser = { id: 'user-456', email: 'test@example.com' };

            mockAuthenticateToken.mockImplementation((req: any, res, next) => {
                req.token = testToken;
                req.user = testUser;
                next();
            });

            mockGenerateAudioPhrases.mockImplementation((req: any, res) => {
                expect(req.token).toBe(testToken);
                expect(req.user).toEqual(testUser);
                res.status(200).json({ token: req.token, user: req.user });
            });

            const response = await request(app)
                .get('/audio/generate-audios')
                .set('Authorization', `Bearer ${testToken}`)
                .expect(200);

            expect(response.body.token).toBe(testToken);
            expect(response.body.user).toEqual(testUser);
        });
    });

    describe('Filename Parameter', () => {
        it('should correctly pass filename parameter to getAudio handler', async () => {
            const testFilename = 'my-audio-file.mp3';

            mockGetAudio.mockImplementation((req: any, res) => {
                expect(req.params.filename).toBe(testFilename);
                res.status(200).json({ filename: req.params.filename });
            });

            const response = await request(app)
                .get(`/audio/${testFilename}`)
                .set('Authorization', validToken)
                .expect(200);

            expect(response.body.filename).toBe(testFilename);
        });
    });
});
