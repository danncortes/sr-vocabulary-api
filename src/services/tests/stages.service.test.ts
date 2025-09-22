import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Create mock function that will be used in the module mock
const mockCreateSBClient = jest.fn();

// Mock the supabaseClient module using unstable_mockModule
jest.unstable_mockModule('../../supabaseClient.js', () => ({
    createSBClient: mockCreateSBClient
}));

// Import the service AFTER mocking
const { getStageById } = await import('../stages.service.js');

describe('Stages Service', () => {
    let mockSupabase: any;
    const mockToken = 'mock-jwt-token';

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Setup mock Supabase client with proper chaining
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
                data: null,
                error: null
            })
        };

        mockCreateSBClient.mockReturnValue(mockSupabase);
    });

    describe('getStageById', () => {
        const mockStageData = {
            id: 1,
            name: 'Stage 1',
            days: 1,
            description: 'First stage'
        };

        it('should successfully return stage data when stage exists', async () => {
            // Arrange
            const stageId = 1;
            mockSupabase.eq.mockReturnValue({
                data: [mockStageData],
                error: null
            });

            // Act
            const result = await getStageById(stageId, mockToken);

            // Assert
            expect(mockCreateSBClient).toHaveBeenCalledWith(mockToken);
            expect(mockSupabase.from).toHaveBeenCalledWith('stages');
            expect(mockSupabase.select).toHaveBeenCalledWith('*');
            expect(mockSupabase.eq).toHaveBeenCalledWith('id', stageId);
            expect(result).toEqual(mockStageData);
        });

        it('should use the provided client token', async () => {
            // Arrange
            const stageId = 2;
            const customToken = 'custom-token-123';
            mockSupabase.eq.mockReturnValue({
                data: [mockStageData],
                error: null
            });

            // Act
            await getStageById(stageId, customToken);

            // Assert
            expect(mockCreateSBClient).toHaveBeenCalledWith(customToken);
        });

        it('should throw error when Supabase returns an error', async () => {
            // Arrange
            const stageId = 1;
            const supabaseError = { message: 'Database connection failed' };
            mockSupabase.eq.mockReturnValue({
                data: null,
                error: supabaseError
            });

            // Act & Assert
            await expect(getStageById(stageId, mockToken))
                .rejects
                .toThrow(`Failed to fetch stage with id ${stageId}: ${supabaseError.message}`);
        });

        it('should throw error when stage is not found (empty data)', async () => {
            // Arrange
            const stageId = 999;
            mockSupabase.eq.mockReturnValue({
                data: [],
                error: null
            });

            // Act & Assert
            await expect(getStageById(stageId, mockToken))
                .rejects
                .toThrow(`Stage with id ${stageId} not found`);
        });

        it('should throw error when stage is not found (null data)', async () => {
            // Arrange
            const stageId = 999;
            mockSupabase.eq.mockReturnValue({
                data: null,
                error: null
            });

            // Act & Assert
            await expect(getStageById(stageId, mockToken))
                .rejects
                .toThrow(`Stage with id ${stageId} not found`);
        });

        it('should return the first stage when multiple stages are returned', async () => {
            // Arrange
            const stageId = 1;
            const multipleStages = [
                { id: 1, name: 'Stage 1', days: 1 },
                { id: 1, name: 'Duplicate Stage', days: 2 }
            ];
            mockSupabase.eq.mockReturnValue({
                data: multipleStages,
                error: null
            });

            // Act
            const result = await getStageById(stageId, mockToken);

            // Assert
            expect(result).toEqual(multipleStages[0]);
        });

        it('should handle different stage data structures', async () => {
            // Arrange
            const stageId = 3;
            const stageWithExtraFields = {
                id: 3,
                name: 'Advanced Stage',
                days: 7,
                description: 'Advanced learning stage',
                difficulty: 'hard',
                created_at: '2024-01-01T00:00:00Z'
            };
            mockSupabase.eq.mockReturnValue({
                data: [stageWithExtraFields],
                error: null
            });

            // Act
            const result = await getStageById(stageId, mockToken);

            // Assert
            expect(result).toEqual(stageWithExtraFields);
            expect(result.difficulty).toBe('hard');
            expect(result.created_at).toBe('2024-01-01T00:00:00Z');
        });
    });
});