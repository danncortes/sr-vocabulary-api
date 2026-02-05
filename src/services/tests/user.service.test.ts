import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Create mock function that will be used in the module mock
const mockCreateSBClient = jest.fn();

// Mock the supabaseClient module using unstable_mockModule
jest.unstable_mockModule('../../supabaseClient.js', () => ({
    createSBClient: mockCreateSBClient
}));

// Import the service AFTER mocking
const { getUserSettings, getUserFromToken } = await import('../user.service.js');

describe('User Settings Service', () => {
    let mockSupabase: any;
    const mockToken = 'mock-jwt-token';

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Setup mock Supabase client with proper chaining
        mockSupabase = {
            auth: {
                getUser: jest.fn()
            },
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
                data: null,
                error: null
            })
        };

        mockCreateSBClient.mockReturnValue(mockSupabase);
    });

    describe('getUserFromToken', () => {
        const mockUser = {
            id: 'user-123',
            email: 'test@example.com'
        };

        it('should return user when token is valid', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: mockUser },
                error: null
            });

            const result = await getUserFromToken(mockToken);

            expect(mockCreateSBClient).toHaveBeenCalledWith(mockToken);
            expect(mockSupabase.auth.getUser).toHaveBeenCalled();
            expect(result).toEqual(mockUser);
        });

        it('should throw error when auth.getUser fails', async () => {
            const mockError = { message: 'Invalid token' };
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: mockError
            });

            await expect(getUserFromToken(mockToken)).rejects.toThrow('Failed to get user from token: Invalid token');
        });

        it('should throw error when user is null', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: null
            });

            await expect(getUserFromToken(mockToken)).rejects.toThrow('User not found from token');
        });
    });

    describe('getUserSettings', () => {
        const mockUser = {
            id: 'user-123',
            email: 'test@example.com'
        };

        const mockUserSettings = {
            id: 1,
            user_id: 'user-123',
            learn_days: ['Monday', 'Tuesday', 'Wednesday'],
            review_days: ['Thursday', 'Friday'],
            daily_goal: 10,
            notifications_enabled: true,
            created_at: '2024-01-01T00:00:00Z'
        };

        it('should successfully return user settings when they exist', async () => {
            // Arrange
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: mockUser },
                error: null
            });
            mockSupabase.eq.mockReturnValue({
                data: [mockUserSettings],
                error: null
            });

            // Act
            const result = await getUserSettings(mockToken);

            // Assert
            expect(mockCreateSBClient).toHaveBeenCalledWith(mockToken);
            expect(mockSupabase.auth.getUser).toHaveBeenCalled();
            expect(mockSupabase.from).toHaveBeenCalledWith('user_settings');
            expect(mockSupabase.select).toHaveBeenCalledWith('*');
            expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', mockUser.id);
            expect(result).toEqual(mockUserSettings);
        });

        it('should use the provided client token', async () => {
            // Arrange
            const customToken = 'custom-token-456';
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: mockUser },
                error: null
            });
            mockSupabase.eq.mockReturnValue({
                data: [mockUserSettings],
                error: null
            });

            // Act
            await getUserSettings(customToken);

            // Assert
            expect(mockCreateSBClient).toHaveBeenCalledWith(customToken);
        });

        it('should throw error when auth.getUser returns an error', async () => {
            // Arrange
            const authError = { message: 'Invalid token' };
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: authError
            });

            // Act & Assert
            await expect(getUserSettings(mockToken))
                .rejects
                .toThrow(`Failed to get user from token: ${authError.message}`);
        });

        it('should throw error when user is not found from token', async () => {
            // Arrange
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: null
            });

            // Act & Assert
            await expect(getUserSettings(mockToken))
                .rejects
                .toThrow('User not found from token');
        });

        it('should throw error when Supabase returns an error', async () => {
            // Arrange
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: mockUser },
                error: null
            });
            const supabaseError = { message: 'Database connection failed' };
            mockSupabase.eq.mockReturnValue({
                data: null,
                error: supabaseError
            });

            // Act & Assert
            await expect(getUserSettings(mockToken))
                .rejects
                .toThrow(`Failed to fetch user settings: ${supabaseError.message}`);
        });

        it('should throw error when user settings are not found (empty data)', async () => {
            // Arrange
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: mockUser },
                error: null
            });
            mockSupabase.eq.mockReturnValue({
                data: [],
                error: null
            });

            // Act & Assert
            await expect(getUserSettings(mockToken))
                .rejects
                .toThrow('User settings not found');
        });

        it('should throw error when user settings are not found (null data)', async () => {
            // Arrange
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: mockUser },
                error: null
            });
            mockSupabase.eq.mockReturnValue({
                data: null,
                error: null
            });

            // Act & Assert
            await expect(getUserSettings(mockToken))
                .rejects
                .toThrow('User settings not found');
        });

        it('should return the first settings when multiple settings are returned', async () => {
            // Arrange
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: mockUser },
                error: null
            });
            const multipleSettings = [
                { id: 1, user_id: 'user-123', daily_goal: 10 },
                { id: 2, user_id: 'user-123', daily_goal: 15 }
            ];
            mockSupabase.eq.mockReturnValue({
                data: multipleSettings,
                error: null
            });

            // Act
            const result = await getUserSettings(mockToken);

            // Assert
            expect(result).toEqual(multipleSettings[0]);
        });

        it('should handle different user settings data structures', async () => {
            // Arrange
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: mockUser },
                error: null
            });
            const settingsWithDifferentLocales = {
                system_lang: { id: 2, locale_code: 'es' },
                learning_lang: { id: 3, locale_code: 'fr' },
                origin_lang: { id: 4, locale_code: 'de' }
            };
            mockSupabase.eq.mockReturnValue({
                data: [settingsWithDifferentLocales],
                error: null
            });

            // Act
            const result = await getUserSettings(mockToken);

            // Assert
            expect(result).toEqual(settingsWithDifferentLocales);
            expect(result.system_lang.locale_code).toBe('es');
            expect(result.learning_lang.locale_code).toBe('fr');
            expect(result.origin_lang.locale_code).toBe('de');
        });

        it('should handle different user ID formats', async () => {
            // Arrange
            const userWithUUID = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                email: 'uuid-user@example.com'
            };
            mockSupabase.auth.getUser.mockResolvedValue({
                data: { user: userWithUUID },
                error: null
            });
            mockSupabase.eq.mockReturnValue({
                data: [{ ...mockUserSettings, user_id: userWithUUID.id }],
                error: null
            });

            // Act
            await getUserSettings(mockToken);

            // Assert
            expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', userWithUUID.id);
        });
    });
});