import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import type { RequestHandler } from 'express';

// Create mock functions
const mockGetUserSettings = jest.fn() as jest.MockedFunction<RequestHandler>;

// Mock the authentication middleware
const mockAuthenticateToken = jest.fn() as jest.MockedFunction<RequestHandler>;

// Mock the createSBClient
const mockCreateSBClient = jest.fn();

// Mock using unstable_mockModule for ES modules
jest.unstable_mockModule('../../../supabaseClient.js', () => ({
    createSBClient: mockCreateSBClient
}));

jest.unstable_mockModule('../user.handlers.js', () => ({
    getUserSettings: mockGetUserSettings
}));

// Mock the auth middleware
jest.unstable_mockModule('../../../middleware/auth.js', () => ({
    authenticateToken: mockAuthenticateToken
}));

// Import router after mocking
const { default: router } = await import('../user.routes.js');

describe('User Routes', () => {
    let app: express.Application;
    const validToken = 'Bearer valid-token-123';

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        // Create Express app and use the router
        app = express();
        app.use(express.json());
        app.use('/user', router);

        // Setup auth middleware mock to simulate successful authentication
        mockAuthenticateToken.mockImplementation((req: any, res, next) => {
            // Simulate adding token and user to request object
            req.token = 'valid-token-123';
            req.user = { id: 'user-123', email: 'test@example.com' };
            next();
        });

        // Setup default mock implementation that responds successfully
        mockGetUserSettings.mockImplementation((req, res) => {
            res.status(200).json({ message: 'getUserSettings called' });
        });

        // Mock Supabase client
        mockCreateSBClient.mockReturnValue({
            auth: {
                signInWithPassword: jest.fn<() => Promise<any>>().mockResolvedValue({
                    data: { user: { id: 'user-123' }, session: { access_token: 'token' } },
                    error: null
                }),
                mfa: {
                    enroll: jest.fn(),
                    challenge: jest.fn(),
                    verify: jest.fn()
                }
            }
        });
    });

    describe('Route Handler Mapping with Authentication', () => {
        it('should call getUserSettings handler for GET /settings with valid token', async () => {
            await request(app)
                .get('/user/settings')
                .set('Authorization', validToken)
                .expect(200);

            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockGetUserSettings).toHaveBeenCalledTimes(1);
        });

        it('should pass request data to handler', async () => {
            mockGetUserSettings.mockImplementation((req, res) => {
                res.status(200).json({
                    token: (req as any).token,
                    user: (req as any).user
                });
            });

            const response = await request(app)
                .get('/user/settings')
                .set('Authorization', validToken)
                .expect(200);

            expect(response.body.token).toBe('valid-token-123');
            expect(response.body.user).toEqual({ id: 'user-123', email: 'test@example.com' });
        });
    });

    describe('Authentication Middleware Tests', () => {
        it('should call authentication middleware for settings route', async () => {
            await request(app)
                .get('/user/settings')
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
                .get('/user/settings')
                .expect(401);

            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockGetUserSettings).not.toHaveBeenCalled();
        });

        it('should not call handler when authentication fails', async () => {
            // Mock authentication middleware to simulate failure
            mockAuthenticateToken.mockImplementation((req, res) => {
                res.status(401).json({ error: 'Unauthorized' });
            });

            await request(app)
                .get('/user/settings')
                .expect(401);

            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
            expect(mockGetUserSettings).not.toHaveBeenCalled();
        });

        it('should require authentication token', async () => {
            mockAuthenticateToken.mockImplementation((req, res) => {
                res.status(401).json({ error: 'Unauthorized: missing token' });
            });

            await request(app)
                .get('/user/settings')
                .expect(401);

            expect(mockGetUserSettings).not.toHaveBeenCalled();
        });

        it('should handle expired token', async () => {
            mockAuthenticateToken.mockImplementation((req, res) => {
                res.status(401).json({ error: 'Unauthorized: token expired' });
            });

            await request(app)
                .get('/user/settings')
                .expect(401);

            expect(mockGetUserSettings).not.toHaveBeenCalled();
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

            mockGetUserSettings.mockImplementation((req: any, res) => {
                expect(req.token).toBe(testToken);
                expect(req.user).toEqual({ id: 'user-456', email: 'user@example.com' });
                res.status(200).json({ token: req.token, user: req.user });
            });

            const response = await request(app)
                .get('/user/settings')
                .set('Authorization', `Bearer ${testToken}`)
                .expect(200);

            expect(response.body.token).toBe(testToken);
            expect(response.body.user).toEqual({ id: 'user-456', email: 'user@example.com' });
        });
    });

    describe('Route Coverage', () => {
        it('should have handler called when route is hit with authentication', async () => {
            await request(app)
                .get('/user/settings')
                .set('Authorization', validToken);

            expect(mockGetUserSettings).toHaveBeenCalledTimes(1);
            expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
        });
    });

    describe('HTTP Methods', () => {
        it('should only accept GET requests for /settings', async () => {
            // GET should work
            await request(app)
                .get('/user/settings')
                .set('Authorization', validToken)
                .expect(200);

            jest.clearAllMocks();

            // POST should not be defined
            await request(app)
                .post('/user/settings')
                .set('Authorization', validToken)
                .send({})
                .expect(404);

            expect(mockGetUserSettings).not.toHaveBeenCalled();
        });

        it('should not accept PUT requests for /settings', async () => {
            await request(app)
                .put('/user/settings')
                .set('Authorization', validToken)
                .send({})
                .expect(404);

            expect(mockGetUserSettings).not.toHaveBeenCalled();
        });

        it('should not accept DELETE requests for /settings', async () => {
            await request(app)
                .delete('/user/settings')
                .set('Authorization', validToken)
                .expect(404);

            expect(mockGetUserSettings).not.toHaveBeenCalled();
        });
    });

    describe('Login Route', () => {
        it('should allow POST requests to /login without authentication', async () => {
            const response = await request(app)
                .post('/user/login')
                .send({ email: 'test@example.com', password: 'password123' });

            // Login route doesn't use authenticateToken middleware
            expect(mockAuthenticateToken).not.toHaveBeenCalled();
            // Note: We're not testing the login handler implementation here,
            // just verifying the route is accessible
        });

        it('should not require authentication for login route', async () => {
            await request(app)
                .post('/user/login')
                .send({ email: 'test@example.com', password: 'password123' });

            expect(mockAuthenticateToken).not.toHaveBeenCalled();
        });
    });
});
