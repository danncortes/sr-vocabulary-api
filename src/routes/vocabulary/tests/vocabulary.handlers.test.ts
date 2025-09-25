import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
    mockVocabularyData,
    mockSupabaseResponse,
    mockSupabaseError,
    mockedStages,
    learnDays,
    reviewDays,
} from '../../../__mocks__/vocabulary.mock.js';
import { User } from '@supabase/supabase-js';

// Create mock function that will be used in the module mock
const mockCreateSBClient = jest.fn();

// Mock the supabaseClient module using unstable_mockModule
jest.unstable_mockModule('../../../supabaseClient.js', () => ({
    createSBClient: mockCreateSBClient
}));

// Mock the service modules
jest.unstable_mockModule('../../../services/vocabulary.service.js', () => ({
    getVocabularyById: jest.fn()
}));

jest.unstable_mockModule('../../../services/stages.service.js', () => ({
    getStageById: jest.fn()
}));

jest.unstable_mockModule('../../../services/review-days.service.js', () => ({
    getUserReviewDays: jest.fn()
}));

jest.unstable_mockModule('../../../services/learn-days.service.js', () => ({
    getUserLearnDays: jest.fn()
}));

// Mock the user service module
jest.unstable_mockModule('../../../services/user.service.js', () => ({
    getUserFromToken: jest.fn()
}));

// Mock the dates utility module
jest.unstable_mockModule('../../../utils/dates.js', () => ({
    addDaysToDate: jest.fn(),
    getNextDateByDay: jest.fn(),
    getTodaysDay: jest.fn(),
    isDateLessThanToday: jest.fn()
}));

// Import the handlers and services after mocking
const { getAllVocabulary, setVocabularyReviewed } = await import('../vocabulary.handlers.js');
const { getVocabularyById } = await import('../../../services/vocabulary.service.js');
const { getStageById } = await import('../../../services/stages.service.js');
const { getUserReviewDays } = await import('../../../services/review-days.service.js');
const { getUserLearnDays } = await import('../../../services/learn-days.service.js');
const { getUserFromToken } = await import('../../../services/user.service.js');
const { addDaysToDate, getNextDateByDay, getTodaysDay, isDateLessThanToday } = await import('../../../utils/dates.js');

describe('getAllVocabulary Handler', () => {
    let mockSupabase: any;
    let req: any;
    let res: any;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Setup mock request and response
        req = {
            token: 'mock-jwt-token' // Token is now provided by middleware
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };

        // Setup mock Supabase client with proper chaining
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            not: jest.fn().mockReturnThis(),
            order: jest.fn()
        };

        mockCreateSBClient.mockReturnValue(mockSupabase);

        // Mock getUserFromToken to return a user object
        (getUserFromToken as jest.MockedFunction<typeof getUserFromToken>).mockResolvedValue({
            id: 'user-123',
            email: 'test@example.com'
        } as User);
    });

    describe('successful requests', () => {
        it('should return vocabulary data with status 200 when request is successful', async () => {
            // Setup mock chain for getAllVocabulary: 1 eq, 4 not, 3 order calls
            mockSupabase.eq.mockReturnValueOnce(mockSupabase); // eq('user_id', user.id)
            mockSupabase.not
                .mockReturnValueOnce(mockSupabase) // not('original', 'is', null)
                .mockReturnValueOnce(mockSupabase) // not('translated', 'is', null)
                .mockReturnValueOnce(mockSupabase) // not('original.audio_url', 'is', null)
                .mockReturnValueOnce(mockSupabase); // not('translated.audio_url', 'is', null)
            mockSupabase.order
                .mockReturnValueOnce(mockSupabase)  // First call: order('priority')
                .mockReturnValueOnce(mockSupabase)  // Second call: order('review_date')
                .mockResolvedValueOnce(mockSupabaseResponse); // Third call: order('id') - resolves with data

            // Act
            await getAllVocabulary(req, res);

            // Assert
            expect(getUserFromToken).toHaveBeenCalledWith('mock-jwt-token');
            expect(mockCreateSBClient).toHaveBeenCalledWith('mock-jwt-token');
            expect(mockSupabase.from).toHaveBeenCalledWith('phrase_translations');
            expect(mockSupabase.select).toHaveBeenCalledWith(`
            id,
            sr_stage_id,
            review_date,
            priority,
            modified_at,
            learned,
            original:phrases!phrase_id (
                id,
                text,
                audio_url
            ),
            translated:phrases!translated_phrase_id (
                id,
                text,
                audio_url
            )
        `);
            expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123');
            expect(mockSupabase.not).toHaveBeenCalledTimes(4);
            expect(mockSupabase.order).toHaveBeenNthCalledWith(1, 'priority', { ascending: true });
            expect(mockSupabase.order).toHaveBeenNthCalledWith(2, 'review_date', { ascending: true });
            expect(mockSupabase.order).toHaveBeenNthCalledWith(3, 'id', { ascending: true });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(mockVocabularyData);
        });

        it('should handle database errors', async () => {
            // Setup mock chain that fails at the end
            mockSupabase.eq.mockReturnValueOnce(mockSupabase);
            mockSupabase.not
                .mockReturnValueOnce(mockSupabase)
                .mockReturnValueOnce(mockSupabase)
                .mockReturnValueOnce(mockSupabase)
                .mockReturnValueOnce(mockSupabase);
            mockSupabase.order
                .mockReturnValueOnce(mockSupabase)
                .mockReturnValueOnce(mockSupabase)
                .mockResolvedValueOnce(mockSupabaseError);

            // Act
            await getAllVocabulary(req, res);

            // Assert
            expect(getUserFromToken).toHaveBeenCalledWith('mock-jwt-token');
            expect(mockCreateSBClient).toHaveBeenCalledWith('mock-jwt-token');
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Database connection failed' });
        });

        it('should handle auth.getUser failing', async () => {
            // Mock getUserFromToken to fail
            (getUserFromToken as jest.MockedFunction<typeof getUserFromToken>).mockRejectedValue(new Error('Invalid token'));

            // Act
            await getAllVocabulary(req, res);

            // Assert
            expect(getUserFromToken).toHaveBeenCalledWith('mock-jwt-token');
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: new Error('Invalid token') });
        });
    });
});

describe('setVocabularyReviewed', () => {
    let mockSupabase: any;
    let req: any;
    let res: any;
    let mockUser: any;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            body: { id: 1 },
            token: 'mock-jwt-token'
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn()
        };

        mockUser = {
            id: 'user-123',
            email: 'test@example.com'
        };

        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn()
        };

        mockCreateSBClient.mockReturnValue(mockSupabase);

        // Mock getUserFromToken to return a user object
        (getUserFromToken as jest.MockedFunction<typeof getUserFromToken>).mockResolvedValue(mockUser);
    });

    it('should set vocabulary with stage 0 on a learn day as reviewed', async () => {
        const todaysDay = 1;

        const phraseTranslation = {
            id: 1,
            sr_stage_id: 0,
            review_date: null,
            priority: 1,
            learned: 0,
        };

        const expectedPhraseTranslation = {
            sr_stage_id: 1,
            review_date: '2025-09-24',
            learned: 0,
        };

        // Mock service calls
        (getVocabularyById as jest.MockedFunction<typeof getVocabularyById>).mockResolvedValue(phraseTranslation);
        (getStageById as jest.MockedFunction<typeof getStageById>).mockResolvedValue(mockedStages[1]);
        (getTodaysDay as jest.MockedFunction<typeof getTodaysDay>).mockReturnValue(todaysDay);
        (getUserReviewDays as jest.MockedFunction<typeof getUserReviewDays>).mockResolvedValue(reviewDays);
        (getUserLearnDays as jest.MockedFunction<typeof getUserLearnDays>).mockResolvedValue(learnDays);
        (addDaysToDate as jest.MockedFunction<typeof addDaysToDate>).mockReturnValue('2025-09-24');

        // Mock Supabase update chain
        mockSupabase.eq.mockReturnValueOnce(mockSupabase); // First eq call for user_id
        mockSupabase.select.mockResolvedValue({
            data: [expectedPhraseTranslation],
            error: null
        });

        await setVocabularyReviewed(req, res);

        // Verify service calls
        expect(getUserFromToken).toHaveBeenCalledWith('mock-jwt-token');
        expect(getVocabularyById).toHaveBeenCalledWith(1, 'mock-jwt-token');
        expect(getStageById).toHaveBeenCalledWith(1, 'mock-jwt-token');
        expect(getTodaysDay).toHaveBeenCalled();
        expect(getUserReviewDays).toHaveBeenCalledWith('mock-jwt-token');
        expect(getUserLearnDays).toHaveBeenCalledWith('mock-jwt-token');
        expect(addDaysToDate).toHaveBeenCalledWith(null, 2);

        // Verify database update
        expect(mockSupabase.from).toHaveBeenCalledWith('phrase_translations');
        expect(mockSupabase.update).toHaveBeenCalledWith(expectedPhraseTranslation);
        expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123');
        expect(mockSupabase.eq).toHaveBeenCalledWith('id', 1);
        expect(mockSupabase.select).toHaveBeenCalled();

        // Verify response
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expectedPhraseTranslation);
    });

    it('should set vocabulary with stage 0 on a non-learn day as reviewed', async () => {
        const todaysDay = 3;

        const phraseTranslation = {
            id: 1,
            sr_stage_id: 0,
            review_date: null,
            priority: 1,
            learned: 0,
        };

        const expectedPhraseTranslation = {
            sr_stage_id: 1,
            review_date: '2025-10-01',
            learned: 0,
        };

        // Mock service calls
        (getVocabularyById as jest.MockedFunction<typeof getVocabularyById>).mockResolvedValue(phraseTranslation);
        (getStageById as jest.MockedFunction<typeof getStageById>).mockResolvedValue(mockedStages[1]);
        (getTodaysDay as jest.MockedFunction<typeof getTodaysDay>).mockReturnValue(todaysDay);
        (getUserReviewDays as jest.MockedFunction<typeof getUserReviewDays>).mockResolvedValue(reviewDays);
        (getUserLearnDays as jest.MockedFunction<typeof getUserLearnDays>).mockResolvedValue(learnDays);
        (getNextDateByDay as jest.MockedFunction<typeof getNextDateByDay>).mockReturnValue('2025-09-29'); // Next highest learn day (2)
        (addDaysToDate as jest.MockedFunction<typeof addDaysToDate>)
            .mockReturnValueOnce('2025-09-24') // First call with review_date
            .mockReturnValueOnce('2025-10-01'); // Second call with next learn day

        // Mock Supabase update chain
        mockSupabase.eq.mockReturnValueOnce(mockSupabase); // First eq call for user_id
        mockSupabase.select.mockResolvedValue({
            data: [expectedPhraseTranslation],
            error: null
        });

        await setVocabularyReviewed(req, res);

        // Verify service calls
        expect(getUserFromToken).toHaveBeenCalledWith('mock-jwt-token');
        expect(getVocabularyById).toHaveBeenCalledWith(1, 'mock-jwt-token');
        expect(getStageById).toHaveBeenCalledWith(1, 'mock-jwt-token');
        expect(getTodaysDay).toHaveBeenCalled();
        expect(getUserReviewDays).toHaveBeenCalledWith('mock-jwt-token');
        expect(getUserLearnDays).toHaveBeenCalledWith('mock-jwt-token');
        expect(getNextDateByDay).toHaveBeenCalledWith(2); // Highest learn day
        expect(addDaysToDate).toHaveBeenCalledWith(null, 2); // First call
        expect(addDaysToDate).toHaveBeenCalledWith('2025-09-29', 2); // Second call with next learn day

        // Verify database update
        expect(mockSupabase.from).toHaveBeenCalledWith('phrase_translations');
        expect(mockSupabase.update).toHaveBeenCalledWith(expectedPhraseTranslation);
        expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123');
        expect(mockSupabase.eq).toHaveBeenCalledWith('id', 1);
        expect(mockSupabase.select).toHaveBeenCalled();

        // Verify response
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expectedPhraseTranslation);
    });

    it('should set vocabulary with stage > 0 on review day as reviewed', async () => {
        const todaysDay = 3;

        const phraseTranslation = {
            id: 1,
            sr_stage_id: 1,
            review_date: '2025-09-24',
            priority: 1,
            learned: 0,
        };

        const expectedPhraseTranslation = {
            id: 1,
            sr_stage_id: 2,
            review_date: '2025-10-01',
            priority: 1,
            learned: 0,
        };

        // Mock service calls
        (getVocabularyById as jest.MockedFunction<typeof getVocabularyById>).mockResolvedValue(phraseTranslation);
        (getStageById as jest.MockedFunction<typeof getStageById>).mockResolvedValue(mockedStages[2]);
        (getTodaysDay as jest.MockedFunction<typeof getTodaysDay>).mockReturnValue(todaysDay);
        (getUserReviewDays as jest.MockedFunction<typeof getUserReviewDays>).mockResolvedValue(reviewDays);
        (getUserLearnDays as jest.MockedFunction<typeof getUserLearnDays>).mockResolvedValue(learnDays);
        (addDaysToDate as jest.MockedFunction<typeof addDaysToDate>).mockReturnValue('2025-10-01');
        (isDateLessThanToday as jest.MockedFunction<typeof isDateLessThanToday>).mockReturnValue(false);

        // Mock Supabase update chain
        mockSupabase.eq.mockReturnValueOnce(mockSupabase); // First eq call for user_id
        mockSupabase.select.mockResolvedValue({
            data: [expectedPhraseTranslation],
            error: null
        });

        await setVocabularyReviewed(req, res);

        // Verify service calls
        expect(getUserFromToken).toHaveBeenCalledWith('mock-jwt-token');
        expect(getVocabularyById).toHaveBeenCalledWith(1, 'mock-jwt-token');
        expect(getStageById).toHaveBeenCalledWith(2, 'mock-jwt-token');
        expect(getTodaysDay).toHaveBeenCalled();
        expect(getUserReviewDays).toHaveBeenCalledWith('mock-jwt-token');
        expect(getUserLearnDays).toHaveBeenCalledWith('mock-jwt-token');
        expect(addDaysToDate).toHaveBeenCalledWith('2025-09-24', 7);
        expect(isDateLessThanToday).toHaveBeenCalledWith('2025-09-24');

        // Verify database update
        expect(mockSupabase.from).toHaveBeenCalledWith('phrase_translations');
        expect(mockSupabase.update).toHaveBeenCalledWith({
            sr_stage_id: 2,
            review_date: '2025-10-01',
            learned: 0
        });
        expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123');
        expect(mockSupabase.eq).toHaveBeenCalledWith('id', 1);
        expect(mockSupabase.select).toHaveBeenCalled();

        // Verify response
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expectedPhraseTranslation);
    });

    it('should set vocabulary with stage > 0 on non-review day as reviewed', async () => {
        const todaysDay = 2;

        const phraseTranslation = {
            id: 1,
            sr_stage_id: 1,
            review_date: '2025-09-24',
            priority: 1,
            learned: 0,
        };

        const expectedPhraseTranslation = {
            id: 1,
            sr_stage_id: 2,
            review_date: '2025-10-01',
            priority: 1,
            learned: 0,
        };

        // Mock service calls
        (getVocabularyById as jest.MockedFunction<typeof getVocabularyById>).mockResolvedValue(phraseTranslation);
        (getStageById as jest.MockedFunction<typeof getStageById>).mockResolvedValue(mockedStages[2]);
        (getTodaysDay as jest.MockedFunction<typeof getTodaysDay>).mockReturnValue(todaysDay);
        (getUserReviewDays as jest.MockedFunction<typeof getUserReviewDays>).mockResolvedValue(reviewDays);
        (getUserLearnDays as jest.MockedFunction<typeof getUserLearnDays>).mockResolvedValue(learnDays);
        (addDaysToDate as jest.MockedFunction<typeof addDaysToDate>).mockReturnValue('2025-10-01');
        (isDateLessThanToday as jest.MockedFunction<typeof isDateLessThanToday>).mockReturnValue(false);

        // Mock Supabase update
        mockSupabase.select.mockResolvedValue({
            data: [expectedPhraseTranslation],
            error: null
        });

        await setVocabularyReviewed(req, res);

        // Verify service calls
        expect(getVocabularyById).toHaveBeenCalledWith(1, 'mock-jwt-token');
        expect(getStageById).toHaveBeenCalledWith(2, 'mock-jwt-token');
        expect(getTodaysDay).toHaveBeenCalled();
        expect(getUserReviewDays).toHaveBeenCalledWith('mock-jwt-token');
        expect(getUserLearnDays).toHaveBeenCalledWith('mock-jwt-token');
        expect(addDaysToDate).toHaveBeenCalledWith('2025-09-24', 7);
        expect(isDateLessThanToday).toHaveBeenCalledWith('2025-09-24');

        // Verify database update
        expect(mockSupabase.from).toHaveBeenCalledWith('phrase_translations');
        expect(mockSupabase.update).toHaveBeenCalledWith({
            sr_stage_id: 2,
            review_date: '2025-10-01',
            learned: 0
        });
        expect(mockSupabase.eq).toHaveBeenCalledWith('id', 1);
        expect(mockSupabase.select).toHaveBeenCalled();

        // Verify response
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expectedPhraseTranslation);
    });

    it('should set expired vocabulary with stage > 0 on review day as reviewed', async () => {
        const todaysDay = 4;

        const phraseTranslation = {
            id: 1,
            sr_stage_id: 1,
            review_date: '2025-09-17',
            priority: 1,
            learned: 0,
        };

        const expectedPhraseTranslation = {
            id: 1,
            sr_stage_id: 2,
            review_date: '2025-10-02',
            priority: 1,
            learned: 0,
        };

        // Mock service calls
        (getVocabularyById as jest.MockedFunction<typeof getVocabularyById>).mockResolvedValue(phraseTranslation);
        (getStageById as jest.MockedFunction<typeof getStageById>).mockResolvedValue(mockedStages[2]);
        (getTodaysDay as jest.MockedFunction<typeof getTodaysDay>).mockReturnValue(todaysDay);
        (getUserReviewDays as jest.MockedFunction<typeof getUserReviewDays>).mockResolvedValue(reviewDays);
        (getUserLearnDays as jest.MockedFunction<typeof getUserLearnDays>).mockResolvedValue(learnDays);
        (isDateLessThanToday as jest.MockedFunction<typeof isDateLessThanToday>).mockReturnValue(true);
        (addDaysToDate as jest.MockedFunction<typeof addDaysToDate>)
            .mockReturnValueOnce('2025-09-24') // First call with review_date
            .mockReturnValueOnce('2025-10-02'); // Second call with empty string (current date)

        // Mock Supabase update
        mockSupabase.select.mockResolvedValue({
            data: [expectedPhraseTranslation],
            error: null
        });

        await setVocabularyReviewed(req, res);

        // Verify service calls
        expect(getVocabularyById).toHaveBeenCalledWith(1, 'mock-jwt-token');
        expect(getStageById).toHaveBeenCalledWith(2, 'mock-jwt-token');
        expect(getTodaysDay).toHaveBeenCalled();
        expect(getUserReviewDays).toHaveBeenCalledWith('mock-jwt-token');
        expect(getUserLearnDays).toHaveBeenCalledWith('mock-jwt-token');
        expect(isDateLessThanToday).toHaveBeenCalledWith('2025-09-17');
        expect(addDaysToDate).toHaveBeenCalledWith('2025-09-17', 7); // First call
        expect(addDaysToDate).toHaveBeenCalledWith('', 7); // Second call with current date

        // Verify database update
        expect(mockSupabase.from).toHaveBeenCalledWith('phrase_translations');
        expect(mockSupabase.update).toHaveBeenCalledWith({
            sr_stage_id: 2,
            review_date: '2025-10-02',
            learned: 0
        });
        expect(mockSupabase.eq).toHaveBeenCalledWith('id', 1);
        expect(mockSupabase.select).toHaveBeenCalled();

        // Verify response
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expectedPhraseTranslation);
    });

    it('should set expired vocabulary with stage > 0 on non-review day as reviewed', async () => {
        const todaysDay = 2;

        const phraseTranslation = {
            id: 1,
            sr_stage_id: 1,
            review_date: '2025-09-17',
            priority: 1,
            learned: 0,
        };

        const expectedPhraseTranslation = {
            id: 1,
            sr_stage_id: 2,
            review_date: '2025-10-01',
            priority: 1,
            learned: 0,
        };

        // Mock service calls
        (getVocabularyById as jest.MockedFunction<typeof getVocabularyById>).mockResolvedValue(phraseTranslation);
        (getStageById as jest.MockedFunction<typeof getStageById>).mockResolvedValue(mockedStages[2]);
        (getTodaysDay as jest.MockedFunction<typeof getTodaysDay>).mockReturnValue(todaysDay);
        (getUserReviewDays as jest.MockedFunction<typeof getUserReviewDays>).mockResolvedValue(reviewDays);
        (getUserLearnDays as jest.MockedFunction<typeof getUserLearnDays>).mockResolvedValue(learnDays);
        (isDateLessThanToday as jest.MockedFunction<typeof isDateLessThanToday>).mockReturnValue(true);
        (getNextDateByDay as jest.MockedFunction<typeof getNextDateByDay>).mockReturnValue('2025-09-24'); // Next lowest review day (3)
        (addDaysToDate as jest.MockedFunction<typeof addDaysToDate>)
            .mockReturnValueOnce('2025-09-24') // First call with review_date
            .mockReturnValueOnce('2025-10-01'); // Second call with next review day

        // Mock Supabase update
        mockSupabase.select.mockResolvedValue({
            data: [expectedPhraseTranslation],
            error: null
        });

        await setVocabularyReviewed(req, res);

        // Verify service calls
        expect(getVocabularyById).toHaveBeenCalledWith(1, 'mock-jwt-token');
        expect(getStageById).toHaveBeenCalledWith(2, 'mock-jwt-token');
        expect(getTodaysDay).toHaveBeenCalled();
        expect(getUserReviewDays).toHaveBeenCalledWith('mock-jwt-token');
        expect(getUserLearnDays).toHaveBeenCalledWith('mock-jwt-token');
        expect(isDateLessThanToday).toHaveBeenCalledWith('2025-09-17');
        expect(getNextDateByDay).toHaveBeenCalledWith(3); // Lowest review day
        expect(addDaysToDate).toHaveBeenCalledWith('2025-09-17', 7); // First call
        expect(addDaysToDate).toHaveBeenCalledWith('2025-09-24', 7); // Second call with next review day

        // Verify database update
        expect(mockSupabase.from).toHaveBeenCalledWith('phrase_translations');
        expect(mockSupabase.update).toHaveBeenCalledWith({
            sr_stage_id: 2,
            review_date: '2025-10-01',
            learned: 0
        });
        expect(mockSupabase.eq).toHaveBeenCalledWith('id', 1);
        expect(mockSupabase.select).toHaveBeenCalled();

        // Verify response
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expectedPhraseTranslation);
    });

    it('should set vocabulary with stage 5 as learned', async () => {
        const todaysDay = 2;

        const phraseTranslation = {
            id: 1,
            sr_stage_id: 5,
            review_date: '2025-10-01',
            priority: 1,
            learned: 0,
        };

        const expectedPhraseTranslation = {
            id: 1,
            sr_stage_id: 6,
            review_date: null,
            priority: 1,
            learned: 1,
        };

        // Mock service calls
        (getVocabularyById as jest.MockedFunction<typeof getVocabularyById>).mockResolvedValue(phraseTranslation);
        (getStageById as jest.MockedFunction<typeof getStageById>).mockResolvedValue(mockedStages[6]);
        (getTodaysDay as jest.MockedFunction<typeof getTodaysDay>).mockReturnValue(todaysDay);
        (getUserReviewDays as jest.MockedFunction<typeof getUserReviewDays>).mockResolvedValue(reviewDays);
        (getUserLearnDays as jest.MockedFunction<typeof getUserLearnDays>).mockResolvedValue(learnDays);
        (addDaysToDate as jest.MockedFunction<typeof addDaysToDate>).mockReturnValue('2025-10-01');

        // Mock Supabase update
        mockSupabase.select.mockResolvedValue({
            data: [expectedPhraseTranslation],
            error: null
        });

        await setVocabularyReviewed(req, res);

        // Verify service calls
        expect(getVocabularyById).toHaveBeenCalledWith(1, 'mock-jwt-token');
        expect(getStageById).toHaveBeenCalledWith(6, 'mock-jwt-token');
        expect(getTodaysDay).toHaveBeenCalled();
        expect(getUserReviewDays).toHaveBeenCalledWith('mock-jwt-token');
        expect(getUserLearnDays).toHaveBeenCalledWith('mock-jwt-token');
        expect(addDaysToDate).toHaveBeenCalledWith('2025-10-01', 0);

        // Verify database update
        expect(mockSupabase.from).toHaveBeenCalledWith('phrase_translations');
        expect(mockSupabase.update).toHaveBeenCalledWith({
            sr_stage_id: 6,
            review_date: null,
            learned: 1
        });
        expect(mockSupabase.eq).toHaveBeenCalledWith('id', 1);
        expect(mockSupabase.select).toHaveBeenCalled();

        // Verify response
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expectedPhraseTranslation);
    });

    it('should handle database errors when request fails', async () => {
        const phraseTranslation = {
            id: 1,
            sr_stage_id: 0,
            review_date: null,
            priority: 1,
            learned: 0,
        };

        // Mock service calls
        (getVocabularyById as jest.MockedFunction<typeof getVocabularyById>).mockResolvedValue(phraseTranslation);
        (getStageById as jest.MockedFunction<typeof getStageById>).mockResolvedValue(mockedStages[1]);
        (getTodaysDay as jest.MockedFunction<typeof getTodaysDay>).mockReturnValue(1);
        (getUserReviewDays as jest.MockedFunction<typeof getUserReviewDays>).mockResolvedValue(reviewDays);
        (getUserLearnDays as jest.MockedFunction<typeof getUserLearnDays>).mockResolvedValue(learnDays);
        (addDaysToDate as jest.MockedFunction<typeof addDaysToDate>).mockReturnValue('2025-09-24');

        // Mock Supabase database error
        mockSupabase.select.mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' }
        });

        await setVocabularyReviewed(req, res);

        // Verify error response
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Database connection failed' });
    });

    it('should handle errors when there are no review or learn days from database', async () => {
        const phraseTranslation = {
            id: 1,
            sr_stage_id: 0,
            review_date: null,
            priority: 1,
            learned: 0,
        };

        // Mock service calls
        (getVocabularyById as jest.MockedFunction<typeof getVocabularyById>).mockResolvedValue(phraseTranslation);
        (getStageById as jest.MockedFunction<typeof getStageById>).mockResolvedValue(mockedStages[1]);
        (getTodaysDay as jest.MockedFunction<typeof getTodaysDay>).mockReturnValue(1);
        (getUserReviewDays as jest.MockedFunction<typeof getUserReviewDays>).mockResolvedValue([]); // No review days
        (getUserLearnDays as jest.MockedFunction<typeof getUserLearnDays>).mockResolvedValue(learnDays);
        (addDaysToDate as jest.MockedFunction<typeof addDaysToDate>).mockReturnValue('2025-09-24');

        await setVocabularyReviewed(req, res);

        // Verify error response
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'There are no Review Days' });
    });

    it('should handle errors when there are no learn days from database', async () => {
        const phraseTranslation = {
            id: 1,
            sr_stage_id: 0,
            review_date: null,
            priority: 1,
            learned: 0,
        };

        // Mock service calls
        (getVocabularyById as jest.MockedFunction<typeof getVocabularyById>).mockResolvedValue(phraseTranslation);
        (getStageById as jest.MockedFunction<typeof getStageById>).mockResolvedValue(mockedStages[1]);
        (getTodaysDay as jest.MockedFunction<typeof getTodaysDay>).mockReturnValue(1);
        (getUserReviewDays as jest.MockedFunction<typeof getUserReviewDays>).mockResolvedValue(reviewDays);
        (getUserLearnDays as jest.MockedFunction<typeof getUserLearnDays>).mockResolvedValue([]); // No learn days
        (addDaysToDate as jest.MockedFunction<typeof addDaysToDate>).mockReturnValue('2025-09-24');

        await setVocabularyReviewed(req, res);

        // Verify error response
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'There are no Learn Days' });
    });

    it('should handle errors when getVocabularyById service fails', async () => {
        // Mock service failure
        (getVocabularyById as jest.MockedFunction<typeof getVocabularyById>).mockRejectedValue(new Error('Vocabulary not found'));

        await setVocabularyReviewed(req, res);

        // Verify error response
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Vocabulary not found' });
    });

    it('should handle errors when getStageById service fails', async () => {
        const phraseTranslation = {
            id: 1,
            sr_stage_id: 0,
            review_date: null,
            priority: 1,
            learned: 0,
        };

        // Mock service calls
        (getVocabularyById as jest.MockedFunction<typeof getVocabularyById>).mockResolvedValue(phraseTranslation);
        (getStageById as jest.MockedFunction<typeof getStageById>).mockRejectedValue(new Error('Stage not found'));

        await setVocabularyReviewed(req, res);

        // Verify error response
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Stage not found' });
    });

    it('should handle errors when getUserReviewDays service fails', async () => {
        const phraseTranslation = {
            id: 1,
            sr_stage_id: 0,
            review_date: null,
            priority: 1,
            learned: 0,
        };

        // Mock service calls
        (getVocabularyById as jest.MockedFunction<typeof getVocabularyById>).mockResolvedValue(phraseTranslation);
        (getStageById as jest.MockedFunction<typeof getStageById>).mockResolvedValue(mockedStages[1]);
        (getTodaysDay as jest.MockedFunction<typeof getTodaysDay>).mockReturnValue(1);
        (getUserReviewDays as jest.MockedFunction<typeof getUserReviewDays>).mockRejectedValue(new Error('Failed to get review days'));
        (getUserLearnDays as jest.MockedFunction<typeof getUserLearnDays>).mockResolvedValue(learnDays);
        (addDaysToDate as jest.MockedFunction<typeof addDaysToDate>).mockReturnValue('2025-09-24');

        await setVocabularyReviewed(req, res);

        // Verify error response
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Failed to get review days' });
    });

    it('should handle errors when getUserLearnDays service fails', async () => {
        const phraseTranslation = {
            id: 1,
            sr_stage_id: 0,
            review_date: null,
            priority: 1,
            learned: 0,
        };

        // Mock service calls
        (getVocabularyById as jest.MockedFunction<typeof getVocabularyById>).mockResolvedValue(phraseTranslation);
        (getStageById as jest.MockedFunction<typeof getStageById>).mockResolvedValue(mockedStages[1]);
        (getTodaysDay as jest.MockedFunction<typeof getTodaysDay>).mockReturnValue(1);
        (getUserReviewDays as jest.MockedFunction<typeof getUserReviewDays>).mockResolvedValue(reviewDays);
        (getUserLearnDays as jest.MockedFunction<typeof getUserLearnDays>).mockRejectedValue(new Error('Failed to get learn days'));
        (addDaysToDate as jest.MockedFunction<typeof addDaysToDate>).mockReturnValue('2025-09-24');

        await setVocabularyReviewed(req, res);

        // Verify error response
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Failed to get learn days' });
    });

    it('should handle errors when utility functions fail', async () => {
        const phraseTranslation = {
            id: 1,
            sr_stage_id: 0,
            review_date: null,
            priority: 1,
            learned: 0,
        };

        // Mock service calls
        (getVocabularyById as jest.MockedFunction<typeof getVocabularyById>).mockResolvedValue(phraseTranslation);
        (getStageById as jest.MockedFunction<typeof getStageById>).mockResolvedValue(mockedStages[1]);
        (getTodaysDay as jest.MockedFunction<typeof getTodaysDay>).mockImplementation(() => {
            throw new Error('Failed to get today\'s day');
        });

        await setVocabularyReviewed(req, res);

        // Verify error response
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Failed to get today\'s day' });
    });

    it('should handle errors when getUserFromToken fails', async () => {
        // Mock getUserFromToken to fail
        (getUserFromToken as jest.MockedFunction<typeof getUserFromToken>).mockRejectedValue(new Error('Invalid token'));

        await setVocabularyReviewed(req, res);

        // Verify error response
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    });

    it('should handle errors when createSBClient fails', async () => {
        // Mock createSBClient to throw an error
        mockCreateSBClient.mockImplementation(() => {
            throw new Error('Failed to create Supabase client');
        });

        await setVocabularyReviewed(req, res);

        // Verify error response
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Failed to create Supabase client' });
    });

    it('should handle missing request body parameters', async () => {
        // Mock request without id
        const reqWithoutId = {
            body: {},
            token: 'mock-jwt-token'
        };

        await setVocabularyReviewed(reqWithoutId, res);

        // Verify error response (this would likely cause an error in getVocabularyById)
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: expect.any(String)
        }));
    })
})