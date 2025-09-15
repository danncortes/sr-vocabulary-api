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

// Mock using unstable_mockModule for ES modules (excluding loadRawVocabulary)
jest.unstable_mockModule('../vocabulary.handlers.js', () => ({
    getAllVocabulary: mockGetAllVocabulary,
    setVocabularyReviewed: mockSetVocabularyReviewed,
    delayManyVocabulary: mockDelayManyVocabulary,
    loadTranslatedVocabulary: mockLoadTranslatedVocabulary,
    resetManyVocabulary: mockResetManyVocabulary,
    restartManyVocabulary: mockRestartManyVocabulary,
    loadRawVocabulary: mockLoadRawVocabulary,
    // Don't mock loadRawVocabulary - let it use the real implementation
}));

// Import router after mocking
const { default: router } = await import('../vocabulary.routes.js');

describe('Vocabulary Routes', () => {
    let app: express.Application;

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        // Create Express app and use the router
        app = express();
        app.use(express.json());
        app.use('/vocabulary', router);

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

    describe('Route Handler Mapping', () => {
        it('should call getAllVocabulary handler for GET /', async () => {
            await request(app)
                .get('/vocabulary')
                .expect(200);

            expect(mockGetAllVocabulary).toHaveBeenCalledTimes(1);
        });

        it('should call setVocabularyReviewed handler for POST /review', async () => {
            await request(app)
                .post('/vocabulary/review')
                .send({})
                .expect(200);

            expect(mockSetVocabularyReviewed).toHaveBeenCalledTimes(1);
        });

        it('should call delayManyVocabulary handler for POST /delay', async () => {
            await request(app)
                .post('/vocabulary/delay')
                .send({})
                .expect(200);

            expect(mockDelayManyVocabulary).toHaveBeenCalledTimes(1);
        });

        it('should call resetManyVocabulary handler for POST /reset', async () => {
            await request(app)
                .post('/vocabulary/reset')
                .send({})
                .expect(200);

            expect(mockResetManyVocabulary).toHaveBeenCalledTimes(1);
        });

        it('should call restartManyVocabulary handler for POST /restart', async () => {
            await request(app)
                .post('/vocabulary/restart')
                .send({})
                .expect(200);

            expect(mockRestartManyVocabulary).toHaveBeenCalledTimes(1);
        });

        it('should call loadTranslatedVocabulary handler for GET /load-translated', async () => {
            await request(app)
                .get('/vocabulary/load-translated')
                .expect(200);

            expect(mockLoadTranslatedVocabulary).toHaveBeenCalledTimes(1);
        });

        it('should call loadRawVocabulary handler for GET /load-raw', async () => {
            await request(app)
                .get('/vocabulary/load-raw')
                .expect(200);

            expect(mockLoadRawVocabulary).toHaveBeenCalledTimes(1);
        });
    });

    describe('Route Coverage', () => {
        it('should have all handlers called exactly once when all routes are hit', async () => {
            // Hit all routes
            await request(app).get('/vocabulary');
            await request(app).post('/vocabulary/review').send({});
            await request(app).post('/vocabulary/delay').send({});
            await request(app).post('/vocabulary/reset').send({});
            await request(app).post('/vocabulary/restart').send({});
            await request(app).get('/vocabulary/load-translated');
            await request(app).get('/vocabulary/load-raw');

            // Verify each handler was called exactly once
            expect(mockGetAllVocabulary).toHaveBeenCalledTimes(1);
            expect(mockSetVocabularyReviewed).toHaveBeenCalledTimes(1);
            expect(mockDelayManyVocabulary).toHaveBeenCalledTimes(1);
            expect(mockResetManyVocabulary).toHaveBeenCalledTimes(1);
            expect(mockRestartManyVocabulary).toHaveBeenCalledTimes(1);
            expect(mockLoadTranslatedVocabulary).toHaveBeenCalledTimes(1);
            expect(mockLoadRawVocabulary).toHaveBeenCalledTimes(1);
        });
    });
});