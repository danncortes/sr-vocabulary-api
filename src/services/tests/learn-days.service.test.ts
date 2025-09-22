import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Create mock functions with proper typing
const mockCreateSBClient = jest.fn();
const mockGetUserFromToken = jest.fn() as jest.MockedFunction<(token: string) => Promise<any>>;

// Mock the dependencies
jest.unstable_mockModule('../../supabaseClient.js', () => ({
    createSBClient: mockCreateSBClient
}));

jest.unstable_mockModule('../user.service.js', () => ({
    getUserFromToken: mockGetUserFromToken
}));

// Import the service AFTER mocking
const { getUserLearnDays } = await import('../learn-days.service.js');

describe('Learn Days Service', () => {
    let mockSupabase: any;
    const mockToken = 'mock-jwt-token';
    const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
    };

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
        mockGetUserFromToken.mockResolvedValue(mockUser);
    });

    describe('getUserLearnDays', () => {
        it('should return array of weekday IDs when learn days exist', async () => {
            const mockLearnDays = [
                { weekday_id: 1 },
                { weekday_id: 2 },
                { weekday_id: 4 },
                { weekday_id: 6 }
            ];

            mockSupabase.eq.mockReturnValue({
                data: mockLearnDays,
                error: null
            });

            const result = await getUserLearnDays(mockToken);

            expect(mockGetUserFromToken).toHaveBeenCalledWith(mockToken);
            expect(mockCreateSBClient).toHaveBeenCalledWith(mockToken);
            expect(mockSupabase.from).toHaveBeenCalledWith('learn_days');
            expect(mockSupabase.select).toHaveBeenCalledWith('weekday_id');
            expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', mockUser.id);
            expect(result).toEqual([1, 2, 4, 6]);
        });

        it('should return empty array when no learn days exist', async () => {
            mockSupabase.eq.mockReturnValue({
                data: [],
                error: null
            });

            const result = await getUserLearnDays(mockToken);

            expect(result).toEqual([]);
        });

        it('should handle single learn day', async () => {
            const mockLearnDays = [{ weekday_id: 3 }];

            mockSupabase.eq.mockReturnValue({
                data: mockLearnDays,
                error: null
            });

            const result = await getUserLearnDays(mockToken);

            expect(result).toEqual([3]);
        });

        it('should throw error when Supabase query fails', async () => {
            const mockError = { message: 'Database connection failed' };
            mockSupabase.eq.mockReturnValue({
                data: null,
                error: mockError
            });

            await expect(getUserLearnDays(mockToken)).rejects.toThrow('Failed to fetch learn days: Database connection failed');
        });

        it('should throw error when data is null', async () => {
            mockSupabase.eq.mockReturnValue({
                data: null,
                error: null
            });

            await expect(getUserLearnDays(mockToken)).rejects.toThrow('No learn days data returned');
        });

        it('should throw error when getUserFromToken fails', async () => {
            mockGetUserFromToken.mockRejectedValue(new Error('Invalid token'));

            await expect(getUserLearnDays(mockToken)).rejects.toThrow('Invalid token');
        });

        it('should handle different weekday ID formats', async () => {
            const mockLearnDays = [
                { weekday_id: 0 },
                { weekday_id: 7 }
            ];

            mockSupabase.eq.mockReturnValue({
                data: mockLearnDays,
                error: null
            });

            const result = await getUserLearnDays(mockToken);

            expect(result).toEqual([0, 7]);
        });

        it('should verify token is used correctly throughout the flow', async () => {
            const mockLearnDays = [{ weekday_id: 5 }];

            mockSupabase.eq.mockReturnValue({
                data: mockLearnDays,
                error: null
            });

            await getUserLearnDays(mockToken);

            // Verify token is passed to both getUserFromToken and createSBClient
            expect(mockGetUserFromToken).toHaveBeenCalledWith(mockToken);
            expect(mockCreateSBClient).toHaveBeenCalledWith(mockToken);
        });

        it('should handle all weekdays (0-6)', async () => {
            const mockLearnDays = [
                { weekday_id: 0 },
                { weekday_id: 1 },
                { weekday_id: 2 },
                { weekday_id: 3 },
                { weekday_id: 4 },
                { weekday_id: 5 },
                { weekday_id: 6 }
            ];

            mockSupabase.eq.mockReturnValue({
                data: mockLearnDays,
                error: null
            });

            const result = await getUserLearnDays(mockToken);

            expect(result).toEqual([0, 1, 2, 3, 4, 5, 6]);
        });
    });
});