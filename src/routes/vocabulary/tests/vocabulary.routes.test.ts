import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import type { RequestHandler } from 'express';

// Create mock functions
const mockGetAllVocabulary = jest.fn() as jest.MockedFunction<RequestHandler>;
const mockSetVocabularyReviewed = jest.fn() as jest.MockedFunction<RequestHandler>;
const mockDelayManyVocabulary = jest.fn() as jest.MockedFunction<RequestHandler>;
const mockLoadTranslatedVocabulary = jest.fn() as jest.MockedFunction<RequestHandler>;
const mockResetManyVocabulary = jest.fn() as jest.MockedFunction<RequestHandler>;
const mockRestartManyVocabulary = jest.fn() as jest.MockedFunction<RequestHandler>;
const mockLoadRawVocabulary = jest.fn() as jest.MockedFunction<RequestHandler>;

// Mock the authentication middleware
const mockAuthenticateToken = jest.fn() as jest.MockedFunction<RequestHandler>;

// Mock using unstable_mockModule for ES modules
jest.unstable_mockModule('../vocabulary.handlers.js', () => ({
    getAllVocabulary: mockGetAllVocabulary,
    setVocabularyReviewed: mockSetVocabularyReviewed,
    delayManyVocabulary: mockDelayManyVocabulary,
    loadTranslatedVocabulary: mockLoadTranslatedVocabulary,
    resetManyVocabulary: mockResetManyVocabulary,
    restartManyVocabulary: mockRestartManyVocabulary,
    loadRawVocabulary: mockLoadRawVocabulary,
}));

// Mock the auth middleware
jest.unstable_mockModule('../../../middleware/auth.js', () => ({
    authenticateToken: mockAuthenticateToken,
}));

// Import router after mocking
const { default: router } = await import('../vocabulary.routes.js');

describe('Vocabulary Routes', () => {
    let app: express.Application;
    const validToken = 'Bearer valid-token-123';

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        // Create Express app and use the router
        app = express();
        app.use(express.json());
        app.use('/vocabulary', router);

        // Setup auth middleware mock to simulate successful authentication
        mockAuthenticateToken.mockImplementation((req: any, res, next) => {
            // Simulate adding token to request object
            req.token = 'valid-token-123';
            next();
        });

        // Setup default mock implementations that respond successfully
        mockGetAllVocabulary.mockImplementation((req, res) => {
            res.status(200).json({ message: 'getAllVocabulary called' });
        });

        mockSetVocabularyReviewed.mockImplementation((req, res) => {
            res.status(200).json({ message: 'setVocabularyReviewed called' });
        });

        mockDelayManyVocabulary.mockImplementation((req, res) => {
            res.status(200).json({ message: 'delayManyVocabulary called' });
        });

        mockLoadTranslatedVocabulary.mockImplementation((req, res) => {
            res.status(200).json({ message: 'loadTranslatedVocabulary called' });
        });

        mockResetManyVocabulary.mockImplementation((req, res) => {
            res.status(200).json({ message: 'resetManyVocabulary called' });
        });

        mockRestartManyVocabulary.mockImplementation((req, res) => {
            res.status(200).json({ message: 'restartManyVocabulary called' });
        });

        mockLoadRawVocabulary.mockImplementation((req, res) => {
            res.status(200).json({ message: 'loadRawVocabulary called' });
        });
    });

    describe('Route Handler Mapping with Authentication', () => {
        it('should call getAllVocabulary handler for GET / with valid token', async () => {
            await request(app)
                .get('/vocabulary')
                .set('Authorization', validToken)
                .expect(200);

            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockGetAllVocabulary).toHaveBeenCalledTimes(1);
        });

        it('should call setVocabularyReviewed handler for POST /reviewed with valid token', async () => {
            await request(app)
                .post('/vocabulary/review')
                .set('Authorization', validToken)
                .send({})
                .expect(200);

            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockSetVocabularyReviewed).toHaveBeenCalledTimes(1);
        });

        it('should call delayManyVocabulary handler for POST /delay with valid token', async () => {
            await request(app)
                .post('/vocabulary/delay')
                .set('Authorization', validToken)
                .send({})
                .expect(200);

            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockDelayManyVocabulary).toHaveBeenCalledTimes(1);
        });

        it('should call resetManyVocabulary handler for POST /reset with valid token', async () => {
            await request(app)
                .post('/vocabulary/reset')
                .set('Authorization', validToken)
                .send({})
                .expect(200);

            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockResetManyVocabulary).toHaveBeenCalledTimes(1);
        });

        it('should call restartManyVocabulary handler for POST /restart with valid token', async () => {
            await request(app)
                .post('/vocabulary/restart')
                .set('Authorization', validToken)
                .send({})
                .expect(200);

            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockRestartManyVocabulary).toHaveBeenCalledTimes(1);
        });

        it('should call loadTranslatedVocabulary handler for POST /load-translated with valid token', async () => {
            await request(app)
                .get('/vocabulary/load-translated')
                .set('Authorization', validToken)
                .send({})
                .expect(200);

            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockLoadTranslatedVocabulary).toHaveBeenCalledTimes(1);
        });

        it('should call loadRawVocabulary handler for POST /load-raw with valid token', async () => {
            await request(app)
                .get('/vocabulary/load-raw')
                .set('Authorization', validToken)
                .send({})
                .expect(200);

            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockLoadRawVocabulary).toHaveBeenCalledTimes(1);
        });
    });

    describe('Authentication Middleware Tests', () => {
        it('should call authentication middleware for all routes', async () => {
            // Test that middleware is called for each route
            const routes = [
                { method: 'get', path: '/vocabulary' },
                { method: 'post', path: '/vocabulary/review' },
                { method: 'post', path: '/vocabulary/delay' },
                { method: 'post', path: '/vocabulary/reset' },
                { method: 'post', path: '/vocabulary/restart' },
                { method: 'get', path: '/vocabulary/load-translated' },
                { method: 'get', path: '/vocabulary/load-raw' },
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
            // Mock authentication middleware to simulate failure
            mockAuthenticateToken.mockImplementation((req, res) => {
                res.status(401).json({ error: 'Unauthorized' });
            });

            await request(app)
                .get('/vocabulary')
                .expect(401);

            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockGetAllVocabulary).not.toHaveBeenCalled();
        });

        it('should not call handlers when authentication fails', async () => {
            // Mock authentication middleware to simulate failure
            mockAuthenticateToken.mockImplementation((req, res) => {
                res.status(401).json({ error: 'Unauthorized' });
            });

            await request(app)
                .post('/vocabulary/review')
                .send({})
                .expect(401);

            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockSetVocabularyReviewed).not.toHaveBeenCalled();
        });
    });

    describe('Route Coverage', () => {
        it('should have all handlers called exactly once when all routes are hit with authentication', async () => {
            // Hit all routes with proper authentication
            await request(app).get('/vocabulary').set('Authorization', validToken);
            await request(app).post('/vocabulary/review').set('Authorization', validToken).send({});
            await request(app).post('/vocabulary/delay').set('Authorization', validToken).send({});
            await request(app).post('/vocabulary/reset').set('Authorization', validToken).send({});
            await request(app).post('/vocabulary/restart').set('Authorization', validToken).send({});
            await request(app).get('/vocabulary/load-translated').set('Authorization', validToken).send({});
            await request(app).get('/vocabulary/load-raw').set('Authorization', validToken).send({});

            // Verify each handler was called exactly once
            expect(mockGetAllVocabulary).toHaveBeenCalledTimes(1);
            expect(mockSetVocabularyReviewed).toHaveBeenCalledTimes(1);
            expect(mockDelayManyVocabulary).toHaveBeenCalledTimes(1);
            expect(mockResetManyVocabulary).toHaveBeenCalledTimes(1);
            expect(mockRestartManyVocabulary).toHaveBeenCalledTimes(1);
            expect(mockLoadTranslatedVocabulary).toHaveBeenCalledTimes(1);
            expect(mockLoadRawVocabulary).toHaveBeenCalledTimes(1);

            // Verify authentication middleware was called for each route
            expect(mockAuthenticateToken).toHaveBeenCalledTimes(7);
        });
    });

    describe('Token Extraction', () => {
        it('should pass extracted token to handlers', async () => {
            const testToken = 'test-token-456';

            // Mock middleware to extract and pass specific token
            mockAuthenticateToken.mockImplementation((req: any, res, next) => {
                req.token = testToken;
                next();
            });

            // Mock handler to verify token is available
            mockGetAllVocabulary.mockImplementation((req: any, res) => {
                expect(req.token).toBe(testToken);
                res.status(200).json({ token: req.token });
            });

            const response = await request(app)
                .get('/vocabulary')
                .set('Authorization', `Bearer ${testToken}`)
                .expect(200);

            expect(response.body.token).toBe(testToken);
        });
    });
});