import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import type { RequestHandler } from 'express';

// Create mock functions
const mockGetLanguageTranslations = jest.fn() as jest.MockedFunction<RequestHandler>;

// Mock the authentication middleware
const mockAuthenticateToken = jest.fn() as jest.MockedFunction<RequestHandler>;

// Mock using unstable_mockModule for ES modules
jest.unstable_mockModule('../languages.handlers.js', () => ({
    getLanguageTranslations: mockGetLanguageTranslations
}));

// Mock the auth middleware
jest.unstable_mockModule('../../../middleware/auth.js', () => ({
    authenticateToken: mockAuthenticateToken
}));

// Import router after mocking
const { default: router } = await import('../languages.routes.js');

describe('Languages Routes', () => {
    let app: express.Application;
    const validToken = 'Bearer valid-token-123';

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        // Create Express app and use the router
        app = express();
        app.use(express.json());
        app.use('/languages', router);

        // Setup auth middleware mock to simulate successful authentication
        mockAuthenticateToken.mockImplementation((req: any, res, next) => {
            // Simulate adding token to request object
            req.token = 'valid-token-123';
            req.user = { id: 'user-123', email: 'test@example.com' };
            next();
        });

        // Setup default mock implementation that responds successfully
        mockGetLanguageTranslations.mockImplementation((req, res) => {
            res.status(200).json({ message: 'getLanguageTranslations called' });
        });
    });

    describe('Route Handler Mapping with Authentication', () => {
        it('should call getLanguageTranslations handler for GET /translations with valid token', async () => {
            await request(app)
                .get('/languages/translations')
                .set('Authorization', validToken)
                .expect(200);

            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockGetLanguageTranslations).toHaveBeenCalledTimes(1);
        });

        it('should pass request data to handler', async () => {
            mockGetLanguageTranslations.mockImplementation((req, res) => {
                res.status(200).json({ token: (req as any).token });
            });

            const response = await request(app)
                .get('/languages/translations')
                .set('Authorization', validToken)
                .expect(200);

            expect(response.body.token).toBe('valid-token-123');
        });
    });

    describe('Authentication Middleware Tests', () => {
        it('should call authentication middleware for translations route', async () => {
            await request(app)
                .get('/languages/translations')
                .set('Authorization', validToken)
                .expect(200);

            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
        });

        it('should handle authentication failure', async () => {
            // Mock authentication middleware to simulate failure
            mockAuthenticateToken.mockImplementation((req, res) => {
                res.status(401).json({ error: 'Unauthorized' });
            });

            await request(app)
                .get('/languages/translations')
                .expect(401);

            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockGetLanguageTranslations).not.toHaveBeenCalled();
        });

        it('should not call handler when authentication fails', async () => {
            // Mock authentication middleware to simulate failure
            mockAuthenticateToken.mockImplementation((req, res) => {
                res.status(401).json({ error: 'Unauthorized' });
            });

            await request(app)
                .get('/languages/translations')
                .expect(401);

            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockGetLanguageTranslations).not.toHaveBeenCalled();
        });

        it('should require authentication token', async () => {
            mockAuthenticateToken.mockImplementation((req, res) => {
                res.status(401).json({ error: 'Unauthorized: missing token' });
            });

            await request(app)
                .get('/languages/translations')
                .expect(401);

            expect(mockGetLanguageTranslations).not.toHaveBeenCalled();
        });
    });

    describe('Token Extraction', () => {
        it('should pass extracted token to handler', async () => {
            const testToken = 'test-token-456';

            mockAuthenticateToken.mockImplementation((req: any, res, next) => {
                req.token = testToken;
                req.user = { id: 'user-456', email: 'user@example.com' };
                next();
            });

            mockGetLanguageTranslations.mockImplementation((req: any, res) => {
                expect(req.token).toBe(testToken);
                expect(req.user).toEqual({ id: 'user-456', email: 'user@example.com' });
                res.status(200).json({ token: req.token, user: req.user });
            });

            const response = await request(app)
                .get('/languages/translations')
                .set('Authorization', `Bearer ${testToken}`)
                .expect(200);

            expect(response.body.token).toBe(testToken);
            expect(response.body.user).toEqual({ id: 'user-456', email: 'user@example.com' });
        });
    });

    describe('Route Coverage', () => {
        it('should have handler called when route is hit with authentication', async () => {
            await request(app)
                .get('/languages/translations')
                .set('Authorization', validToken);

            expect(mockGetLanguageTranslations).toHaveBeenCalledTimes(1);
            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
        });
    });

    describe('HTTP Methods', () => {
        it('should only accept GET requests for /translations', async () => {
            // GET should work
            await request(app)
                .get('/languages/translations')
                .set('Authorization', validToken)
                .expect(200);

            jest.clearAllMocks();

            // POST should not be defined
            await request(app)
                .post('/languages/translations')
                .set('Authorization', validToken)
                .send({})
                .expect(404);

            expect(mockGetLanguageTranslations).not.toHaveBeenCalled();
        });

        it('should not accept PUT requests for /translations', async () => {
            await request(app)
                .put('/languages/translations')
                .set('Authorization', validToken)
                .send({})
                .expect(404);

            expect(mockGetLanguageTranslations).not.toHaveBeenCalled();
        });

        it('should not accept DELETE requests for /translations', async () => {
            await request(app)
                .delete('/languages/translations')
                .set('Authorization', validToken)
                .expect(404);

            expect(mockGetLanguageTranslations).not.toHaveBeenCalled();
        });
    });
});
