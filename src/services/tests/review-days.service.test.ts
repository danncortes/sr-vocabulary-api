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
const { getUserReviewDays } = await import('../review-days.service.js');

describe('Review Days Service', () => {
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

    describe('getUserReviewDays', () => {
        it('should return array of weekday IDs when review days exist', async () => {
            const mockReviewDays = [
                { weekday_id: 1 },
                { weekday_id: 3 },
                { weekday_id: 5 }
            ];

            mockSupabase.eq.mockReturnValue({
                data: mockReviewDays,
                error: null
            });

            const result = await getUserReviewDays(mockToken);

            expect(mockGetUserFromToken).toHaveBeenCalledWith(mockToken);
            expect(mockCreateSBClient).toHaveBeenCalledWith(mockToken);
            expect(mockSupabase.from).toHaveBeenCalledWith('review_days');
            expect(mockSupabase.select).toHaveBeenCalledWith('weekday_id');
            expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', mockUser.id);
            expect(result).toEqual([1, 3, 5]);
        });

        it('should return empty array when no review days exist', async () => {
            mockSupabase.eq.mockReturnValue({
                data: [],
                error: null
            });

            const result = await getUserReviewDays(mockToken);

            expect(result).toEqual([]);
        });

        it('should handle single review day', async () => {
            const mockReviewDays = [{ weekday_id: 7 }];

            mockSupabase.eq.mockReturnValue({
                data: mockReviewDays,
                error: null
            });

            const result = await getUserReviewDays(mockToken);

            expect(result).toEqual([7]);
        });

        it('should throw error when Supabase query fails', async () => {
            const mockError = { message: 'Database connection failed' };
            mockSupabase.eq.mockReturnValue({
                data: null,
                error: mockError
            });

            await expect(getUserReviewDays(mockToken)).rejects.toThrow('Failed to fetch review days: Database connection failed');
        });

        it('should throw error when data is null', async () => {
            mockSupabase.eq.mockReturnValue({
                data: null,
                error: null
            });

            await expect(getUserReviewDays(mockToken)).rejects.toThrow('No review days data returned');
        });

        it('should throw error when getUserFromToken fails', async () => {
            mockGetUserFromToken.mockRejectedValue(new Error('Invalid token'));

            await expect(getUserReviewDays(mockToken)).rejects.toThrow('Invalid token');
        });

        it('should handle different weekday ID formats', async () => {
            const mockReviewDays = [
                { weekday_id: 0 },
                { weekday_id: 6 }
            ];

            mockSupabase.eq.mockReturnValue({
                data: mockReviewDays,
                error: null
            });

            const result = await getUserReviewDays(mockToken);

            expect(result).toEqual([0, 6]);
        });

        it('should verify token is used correctly throughout the flow', async () => {
            const mockReviewDays = [{ weekday_id: 2 }];

            mockSupabase.eq.mockReturnValue({
                data: mockReviewDays,
                error: null
            });

            await getUserReviewDays(mockToken);

            // Verify token is passed to both getUserFromToken and createSBClient
            expect(mockGetUserFromToken).toHaveBeenCalledWith(mockToken);
            expect(mockCreateSBClient).toHaveBeenCalledWith(mockToken);
        });
    });
});