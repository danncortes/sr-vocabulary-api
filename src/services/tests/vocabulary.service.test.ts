import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Create mock function that will be used in the module mock
const mockCreateSBClient = jest.fn();

// Mock the supabaseClient module using unstable_mockModule
jest.unstable_mockModule('../../supabaseClient.js', () => ({
    createSBClient: mockCreateSBClient
}));

// Import the service functions after mocking
const { getVocabularyById, getVocabularyByIds } = await import('../vocabulary.service.js');

describe('getVocabularyById Function', () => {
    let mockSupabase: any;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Setup mock Supabase client with proper chaining
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis()
        };

        mockCreateSBClient.mockReturnValue(mockSupabase);
    });

    describe('successful requests', () => {
        it('should return vocabulary data when found', async () => {
            // Arrange
            const id = 123;
            const token = 'test-token';
            const mockData = [{ id: 123, text: 'test vocabulary' }];

            mockSupabase.eq.mockResolvedValue({
                data: mockData,
                error: null
            });

            // Act
            const result = await getVocabularyById(id, token);

            // Assert
            expect(mockCreateSBClient).toHaveBeenCalledWith(token);
            expect(mockSupabase.from).toHaveBeenCalledWith('phrase_translations');
            expect(mockSupabase.select).toHaveBeenCalledWith('*');
            expect(mockSupabase.eq).toHaveBeenCalledWith('id', id);
            expect(result).toEqual(mockData[0]);
        });

        it('should create Supabase client with provided token', async () => {
            // Arrange
            const id = 123;
            const token = 'test-token';
            const mockData = [{ id: 123, text: 'test' }];

            mockSupabase.eq.mockResolvedValue({
                data: mockData,
                error: null
            });

            // Act
            await getVocabularyById(id, token);

            // Assert
            expect(mockCreateSBClient).toHaveBeenCalledWith(token);
        });
    });

    describe('error handling', () => {
        it('should throw error when Supabase returns an error', async () => {
            // Arrange
            const id = 123;
            const token = 'test-token';
            const mockError = { message: 'Database connection failed' };

            mockSupabase.eq.mockResolvedValue({
                data: null,
                error: mockError
            });

            // Act & Assert
            await expect(getVocabularyById(id, token))
                .rejects
                .toThrow('Failed to fetch vocabulary with id 123: Database connection failed');
        });

        it('should throw error when no data is found', async () => {
            // Arrange
            const id = 456;
            const token = 'test-token';

            mockSupabase.eq.mockResolvedValue({
                data: [],
                error: null
            });

            // Act & Assert
            await expect(getVocabularyById(id, token))
                .rejects
                .toThrow('Vocabulary with id 456 not found');
        });

        it('should throw error when data is null', async () => {
            // Arrange
            const id = 789;
            const token = 'test-token';

            mockSupabase.eq.mockResolvedValue({
                data: null,
                error: null
            });

            // Act & Assert
            await expect(getVocabularyById(id, token))
                .rejects
                .toThrow('Vocabulary with id 789 not found');
        });
    });
});

describe('getVocabularyByIds Function', () => {
    let mockSupabase: any;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Setup mock Supabase client with proper chaining
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis()
        };

        mockCreateSBClient.mockReturnValue(mockSupabase);
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

            mockSupabase.in.mockResolvedValue({
                data: mockData,
                error: null
            });

            // Act
            const result = await getVocabularyByIds(ids, token);

            // Assert
            expect(mockCreateSBClient).toHaveBeenCalledWith(token);
            expect(mockSupabase.from).toHaveBeenCalledWith('phrase_translations');
            expect(mockSupabase.select).toHaveBeenCalledWith('*');
            expect(mockSupabase.in).toHaveBeenCalledWith('id', ids);
            expect(result).toEqual(mockData);
        });

        it('should return empty array when no data found', async () => {
            // Arrange
            const ids = [999];
            const token = 'test-token';

            mockSupabase.in.mockResolvedValue({
                data: null,
                error: null
            });

            // Act
            const result = await getVocabularyByIds(ids, token);

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('error handling', () => {
        it('should throw error when Supabase returns an error', async () => {
            // Arrange
            const ids = [123, 456];
            const token = 'test-token';
            const mockError = { message: 'Database connection failed' };

            mockSupabase.in.mockResolvedValue({
                data: null,
                error: mockError
            });

            // Act & Assert
            await expect(getVocabularyByIds(ids, token))
                .rejects
                .toThrow('Failed to fetch vocabulary items: Database connection failed');
        });
    });
});