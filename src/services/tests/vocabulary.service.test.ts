import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { getUserFromToken } from '../user.service.js';
import { User } from '@supabase/supabase-js';

// Create mock function that will be used in the module mock
const mockCreateSBClient = jest.fn();
const mockGetUserFromToken = jest.fn() as jest.MockedFunction<(token: string) => Promise<User>>;
const mockAddDaysToDate = jest.fn();

// Mock the supabaseClient module using unstable_mockModule
jest.unstable_mockModule('../../supabaseClient.js', () => ({
    createSBClient: mockCreateSBClient
}));

// Mock the user service module
jest.unstable_mockModule('../user.service.js', () => ({
    getUserFromToken: mockGetUserFromToken
}));

// Mock the dates utility module
jest.unstable_mockModule('../../utils/dates.js', () => ({
    addDaysToDate: mockAddDaysToDate
}));

// Import the service functions after mocking
const { 
    getVocabularyById, 
    getVocabularyByIds, 
    getManyVocabulary, 
    delayVocabulary, 
    resetVocabulary, 
    restartVocabulary 
} = await import('../vocabulary.service.js');

describe('getVocabularyById Function', () => {
    let mockSupabase: any;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Setup mock Supabase client with proper chaining
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn()
        };

        mockCreateSBClient.mockReturnValue(mockSupabase);

        // Mock getUserFromToken to return a user object
        (mockGetUserFromToken as jest.MockedFunction<typeof getUserFromToken>).mockResolvedValue({
            id: 'user-123',
            email: 'test@example.com'
        } as User);
    });

    describe('successful requests', () => {
        it('should return vocabulary data when found', async () => {
            // Arrange
            const id = 123;
            const token = 'test-token';
            const mockData = [{ id: 123, text: 'test vocabulary' }];

            // Setup mock chain
            mockSupabase.eq
                .mockReturnValueOnce(mockSupabase) // First eq call for user_id
                .mockResolvedValueOnce({ data: mockData, error: null }); // Second eq call for id

            // Act
            const result = await getVocabularyById(id, token);

            // Assert
            expect(mockGetUserFromToken).toHaveBeenCalledWith(token);
            expect(mockCreateSBClient).toHaveBeenCalledWith(token);
            expect(mockSupabase.from).toHaveBeenCalledWith('phrase_translations');
            expect(mockSupabase.select).toHaveBeenCalledWith('*');
            expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123');
            expect(mockSupabase.eq).toHaveBeenCalledWith('id', id);
            expect(result).toEqual(mockData[0]);
        });

        it('should create Supabase client with provided token', async () => {
            // Arrange
            const id = 123;
            const token = 'specific-token';
            const mockData = [{ id: 123, text: 'test vocabulary' }];

            mockSupabase.eq
                .mockReturnValueOnce(mockSupabase)
                .mockResolvedValueOnce({ data: mockData, error: null });

            // Act
            await getVocabularyById(id, token);

            // Assert
            expect(mockCreateSBClient).toHaveBeenCalledWith(token);
        });
    });

    describe('error handling', () => {
        it('should throw error when getUserFromToken fails', async () => {
            // Arrange
            const id = 123;
            const token = 'test-token';
            const errorMessage = 'Invalid token';

            (mockGetUserFromToken as jest.MockedFunction<typeof getUserFromToken>)
                .mockRejectedValue(new Error(errorMessage));

            // Act & Assert
            await expect(getVocabularyById(id, token)).rejects.toThrow(errorMessage);
        });

        it('should throw error when user not found', async () => {
            // Arrange
            const id = 123;
            const token = 'test-token';

            (mockGetUserFromToken as jest.MockedFunction<typeof getUserFromToken>)
                .mockResolvedValue(null as any);

            // Act & Assert
            await expect(getVocabularyById(id, token)).rejects.toThrow();
        });

        it('should throw error when Supabase returns an error', async () => {
            // Arrange
            const id = 123;
            const token = 'test-token';
            const errorMessage = 'Database connection failed';

            mockSupabase.eq
                .mockReturnValueOnce(mockSupabase)
                .mockResolvedValueOnce({ data: null, error: { message: errorMessage } });

            // Act & Assert
            await expect(getVocabularyById(id, token)).rejects.toThrow(`Failed to fetch vocabulary with id ${id}: ${errorMessage}`);
        });

        it('should throw error when no data is found', async () => {
            // Arrange
            const id = 123;
            const token = 'test-token';

            mockSupabase.eq
                .mockReturnValueOnce(mockSupabase)
                .mockResolvedValueOnce({ data: [], error: null });

            // Act & Assert
            await expect(getVocabularyById(id, token)).rejects.toThrow(`Vocabulary with id ${id} not found`);
        });

        it('should throw error when data is null', async () => {
            // Arrange
            const id = 123;
            const token = 'test-token';

            mockSupabase.eq
                .mockReturnValueOnce(mockSupabase)
                .mockResolvedValueOnce({ data: null, error: null });

            // Act & Assert
            await expect(getVocabularyById(id, token)).rejects.toThrow(`Vocabulary with id ${id} not found`);
        });
    });
});

describe('getVocabularyByIds Function', () => {
    let mockSupabase: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: jest.fn()
        };

        mockCreateSBClient.mockReturnValue(mockSupabase);

        (mockGetUserFromToken as jest.MockedFunction<typeof getUserFromToken>).mockResolvedValue({
            id: 'user-123',
            email: 'test@example.com'
        } as User);
    });

    describe('successful requests', () => {
        it('should return vocabulary data for multiple ids', async () => {
            // Arrange
            const ids = [123, 456];
            const token = 'test-token';
            const mockData = [
                { id: 123, text: 'test vocabulary 1' },
                { id: 456, text: 'test vocabulary 2' }
            ];

            mockSupabase.in.mockResolvedValue({ data: mockData, error: null });

            // Act
            const result = await getVocabularyByIds(ids, token);

            // Assert
            expect(mockGetUserFromToken).toHaveBeenCalledWith(token);
            expect(mockCreateSBClient).toHaveBeenCalledWith(token);
            expect(mockSupabase.from).toHaveBeenCalledWith('phrase_translations');
            expect(mockSupabase.select).toHaveBeenCalledWith('*');
            expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123');
            expect(mockSupabase.in).toHaveBeenCalledWith('id', ids);
            expect(result).toEqual(mockData);
        });

        it('should return empty array when no data found', async () => {
            // Arrange
            const ids = [123, 456];
            const token = 'test-token';

            mockSupabase.in.mockResolvedValue({ data: null, error: null });

            // Act
            const result = await getVocabularyByIds(ids, token);

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('error handling', () => {
        it('should throw error when getUserFromToken fails', async () => {
            // Arrange
            const ids = [123, 456];
            const token = 'test-token';
            const errorMessage = 'Invalid token';

            (mockGetUserFromToken as jest.MockedFunction<typeof getUserFromToken>)
                .mockRejectedValue(new Error(errorMessage));

            // Act & Assert
            await expect(getVocabularyByIds(ids, token)).rejects.toThrow(errorMessage);
        });

        it('should throw error when Supabase returns an error', async () => {
            // Arrange
            const ids = [123, 456];
            const token = 'test-token';
            const errorMessage = 'Database connection failed';

            mockSupabase.in.mockResolvedValue({ data: null, error: { message: errorMessage } });

            // Act & Assert
            await expect(getVocabularyByIds(ids, token)).rejects.toThrow(`Failed to fetch vocabulary items: ${errorMessage}`);
        });
    });
});

describe('getManyVocabulary Function', () => {
    let mockSupabase: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            eq: jest.fn()
        };

        mockCreateSBClient.mockReturnValue(mockSupabase);

        (mockGetUserFromToken as jest.MockedFunction<typeof getUserFromToken>).mockResolvedValue({
            id: 'user-123',
            email: 'test@example.com'
        } as User);
    });

    it('should return Supabase query result for multiple vocabulary items', async () => {
        // Arrange
        const ids = [1, 2, 3];
        const token = 'test-token';
        const mockResult = {
            data: [
                { id: 1, text: 'vocab 1' },
                { id: 2, text: 'vocab 2' },
                { id: 3, text: 'vocab 3' }
            ],
            error: null
        };

        mockSupabase.eq.mockResolvedValue(mockResult);

        // Act
        const result = await getManyVocabulary(ids, token);

        // Assert
        expect(mockGetUserFromToken).toHaveBeenCalledWith(token);
        expect(mockCreateSBClient).toHaveBeenCalledWith(token);
        expect(mockSupabase.from).toHaveBeenCalledWith('phrase_translations');
        expect(mockSupabase.select).toHaveBeenCalledWith('*');
        expect(mockSupabase.in).toHaveBeenCalledWith('id', ids);
        expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123');
        expect(result).toEqual(mockResult);
    });

    it('should handle errors from getUserFromToken', async () => {
        // Arrange
        const ids = [1, 2, 3];
        const token = 'invalid-token';
        const errorMessage = 'Invalid token';

        (mockGetUserFromToken as jest.MockedFunction<typeof getUserFromToken>)
            .mockRejectedValue(new Error(errorMessage));

        // Act & Assert
        await expect(getManyVocabulary(ids, token)).rejects.toThrow(errorMessage);
    });
});

describe('delayVocabulary Function', () => {
    let mockSupabase: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn()
        };

        mockAddDaysToDate.mockReturnValue('2023-12-25');
    });

    it('should successfully delay vocabulary item', async () => {
        // Arrange
        const props = {
            vocabulary: { id: 1, review_date: '2023-12-20', text: 'test' },
            days: 5,
            userId: 'user-123',
            supabaseInstance: mockSupabase
        };

        mockSupabase.eq
            .mockReturnValueOnce(mockSupabase) // First eq call for user_id
            .mockResolvedValueOnce({ error: null }); // Second eq call for id

        // Act
        const result = await delayVocabulary(props);

        // Assert
        expect(mockAddDaysToDate).toHaveBeenCalledWith('2023-12-20', 5);
        expect(mockSupabase.from).toHaveBeenCalledWith('phrase_translations');
        expect(mockSupabase.update).toHaveBeenCalledWith({
            review_date: '2023-12-25'
        });
        expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123');
        expect(mockSupabase.eq).toHaveBeenCalledWith('id', 1);
        expect(result).toEqual({
            data: { ...props.vocabulary, review_date: '2023-12-25' }
        });
    });

    it('should return error when Supabase update fails', async () => {
        // Arrange
        const props = {
            vocabulary: { id: 1, review_date: '2023-12-20', text: 'test' },
            days: 5,
            userId: 'user-123',
            supabaseInstance: mockSupabase
        };
        const errorMessage = 'Update failed';

        mockSupabase.eq
            .mockReturnValueOnce(mockSupabase)
            .mockResolvedValueOnce({ error: { message: errorMessage } });

        // Act
        const result = await delayVocabulary(props);

        // Assert
        expect(result).toEqual({ error: errorMessage });
    });
});

describe('resetVocabulary Function', () => {
    let mockSupabase: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn()
        };
    });

    it('should successfully reset vocabulary item', async () => {
        // Arrange
        const id = 1;
        const userId = 'user-123';
        const mockData = [{ id: 1, sr_stage_id: 0, review_date: null, learned: 0 }];

        mockSupabase.select.mockResolvedValue({ data: mockData, error: null });

        // Act
        const result = await resetVocabulary(id, userId, mockSupabase);

        // Assert
        expect(mockSupabase.from).toHaveBeenCalledWith('phrase_translations');
        expect(mockSupabase.update).toHaveBeenCalledWith({
            sr_stage_id: 0,
            review_date: null,
            learned: 0
        });
        expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', userId);
        expect(mockSupabase.eq).toHaveBeenCalledWith('id', id);
        expect(mockSupabase.select).toHaveBeenCalled();
        expect(result).toEqual({ data: mockData[0] });
    });

    it('should return error when Supabase update fails', async () => {
        // Arrange
        const id = 1;
        const userId = 'user-123';
        const errorMessage = 'Reset failed';

        mockSupabase.select.mockResolvedValue({ data: null, error: { message: errorMessage } });

        // Act
        const result = await resetVocabulary(id, userId, mockSupabase);

        // Assert
        expect(result).toEqual({ error: errorMessage });
    });
});

describe('restartVocabulary Function', () => {
    let mockSupabase: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            select: jest.fn()
        };
    });

    it('should successfully restart vocabulary item', async () => {
        // Arrange
        const props = {
            vocabularyId: 1,
            userId: 'user-123',
            reviewDate: '2023-12-25',
            supabaseInstance: mockSupabase
        };
        const mockData = [{ id: 1, sr_stage_id: 1, review_date: '2023-12-25', learned: 0 }];

        mockSupabase.select.mockResolvedValue({ data: mockData, error: null });

        // Act
        const result = await restartVocabulary(props);

        // Assert
        expect(mockSupabase.from).toHaveBeenCalledWith('phrase_translations');
        expect(mockSupabase.update).toHaveBeenCalledWith({
            sr_stage_id: 1,
            review_date: '2023-12-25',
            learned: 0
        });
        expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123');
        expect(mockSupabase.eq).toHaveBeenCalledWith('id', 1);
        expect(mockSupabase.select).toHaveBeenCalled();
        expect(result).toEqual({ data: mockData[0] });
    });

    it('should return error when Supabase update fails', async () => {
        // Arrange
        const props = {
            vocabularyId: 1,
            userId: 'user-123',
            reviewDate: '2023-12-25',
            supabaseInstance: mockSupabase
        };
        const errorMessage = 'Restart failed';

        mockSupabase.select.mockResolvedValue({ data: null, error: { message: errorMessage } });

        // Act
        const result = await restartVocabulary(props);

        // Assert
        expect(result).toEqual({ error: errorMessage });
    });
});