import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import express, { type RequestHandler } from 'express';
import request from 'supertest';

const mockGetUserSettings = jest.fn() as jest.MockedFunction<RequestHandler>;
const mockAuthenticateToken = jest.fn() as jest.MockedFunction<RequestHandler>;

jest.unstable_mockModule('../user.handlers.js', () => ({
    getUserSettings: mockGetUserSettings
}));
jest.unstable_mockModule('../../../middleware/auth.js', () => ({
    authenticateToken: mockAuthenticateToken
}));

const { default: router } = await import('../user.routes.js');

describe('User routes', () => {
    let app: express.Application;

    beforeEach(() => {
        jest.clearAllMocks();
        app = express();
        app.use(express.json());
        app.use('/user', router);

        mockAuthenticateToken.mockImplementation((req: any, _res, next) => {
            req.token = 'valid-token';
            req.user = { id: 'user-123', email: 'allowed@example.test' };
            next();
        });
        mockGetUserSettings.mockImplementation((_req, res) => {
            res.status(200).json({ daily_goal: 10 });
        });
    });

    it('protects and serves GET /settings', async () => {
        await request(app)
            .get('/user/settings')
            .set('Authorization', 'Bearer valid-token')
            .expect(200, { daily_goal: 10 });

        expect(mockAuthenticateToken).toHaveBeenCalledTimes(1);
        expect(mockGetUserSettings).toHaveBeenCalledTimes(1);
    });

    it('does not call the handler when authentication fails', async () => {
        mockAuthenticateToken.mockImplementation((_req, res) => {
            res.status(401).json({ error: 'Unauthorized' });
        });

        await request(app).get('/user/settings').expect(401);
        expect(mockGetUserSettings).not.toHaveBeenCalled();
    });

    it.each(['/user/login', '/user/refresh'])(
        'does not expose the retired password endpoint %s',
        async (path) => {
            await request(app).post(path).send({}).expect(404);
        }
    );
});
