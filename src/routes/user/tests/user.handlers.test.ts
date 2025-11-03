import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Create mock functions
const mockGetUserSettingsService = jest.fn() as jest.MockedFunction<(token: string) => Promise<any>>;

// Mock the user service module
jest.unstable_mockModule('../../../services/user.service.js', () => ({
    getUserSettings: mockGetUserSettingsService,
    getUserFromToken: jest.fn()
}));

// Import the handlers after mocking
const { getUserSettings } = await import('../user.handlers.js');

describe('getUserSettings Handler', () => {
    let req: any;
    let res: any;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Setup mock request and response
        req = {
            token: 'mock-jwt-token',
            user: {
                id: 'user-123',
                email: 'test@example.com'
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
    });

    describe('successful requests', () => {
        it('should return user settings with status 200', async () => {
            // Arrange
            const mockSettings = {
                id: 1,
                user_id: 'user-123',
                origin_lang_id: 1,
                learning_lang_id: 2,
                daily_goal: 10
            };
            mockGetUserSettingsService.mockResolvedValueOnce(mockSettings);

            // Act
            await getUserSettings(req, res);

            // Assert
            expect(mockGetUserSettingsService).toHaveBeenCalledWith('mock-jwt-token');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockSettings);
        });

        it('should use the token from request', async () => {
            // Arrange
            const customToken = 'custom-token-xyz';
            req.token = customToken;
            const mockSettings = { id: 1, user_id: 'user-123' };
            mockGetUserSettingsService.mockResolvedValueOnce(mockSettings);

            // Act
            await getUserSettings(req, res);

            // Assert
            expect(mockGetUserSettingsService).toHaveBeenCalledWith(customToken);
        });

        it('should return complete user settings object', async () => {
            // Arrange
            const mockSettings = {
                id: 5,
                user_id: 'user-456',
                origin_lang_id: 2,
                learning_lang_id: 3,
                daily_goal: 20,
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-15T00:00:00Z'
            };
            mockGetUserSettingsService.mockResolvedValueOnce(mockSettings);

            // Act
            await getUserSettings(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(mockSettings);
        });
    });

    describe('error handling', () => {
        it('should return 500 when service throws error', async () => {
            // Arrange
            const errorMessage = 'Failed to fetch user settings';
            mockGetUserSettingsService.mockRejectedValueOnce(new Error(errorMessage));

            // Act
            await getUserSettings(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
        });

        it('should handle user not found error', async () => {
            // Arrange
            mockGetUserSettingsService.mockRejectedValueOnce(new Error('User settings not found'));

            // Act
            await getUserSettings(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'User settings not found' });
        });

        it('should handle invalid token error', async () => {
            // Arrange
            mockGetUserSettingsService.mockRejectedValueOnce(new Error('Failed to get user from token: Invalid token'));

            // Act
            await getUserSettings(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Failed to get user from token: Invalid token' });
        });

        it('should handle database connection error', async () => {
            // Arrange
            mockGetUserSettingsService.mockRejectedValueOnce(new Error('Database connection failed'));

            // Act
            await getUserSettings(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Database connection failed' });
        });
    });

    describe('authentication', () => {
        it('should require token to be present in request', async () => {
            // Arrange
            const mockSettings = { id: 1, user_id: 'user-123' };
            mockGetUserSettingsService.mockResolvedValueOnce(mockSettings);

            // Act
            await getUserSettings(req, res);

            // Assert
            expect(mockGetUserSettingsService).toHaveBeenCalledWith('mock-jwt-token');
            expect(mockGetUserSettingsService).toHaveBeenCalledTimes(1);
        });

        it('should handle missing token gracefully', async () => {
            // Arrange
            req.token = undefined;
            mockGetUserSettingsService.mockRejectedValueOnce(new Error('Failed to get user from token'));

            // Act
            await getUserSettings(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('response format', () => {
        it('should return settings directly as JSON', async () => {
            // Arrange
            const mockSettings = { id: 1, user_id: 'user-123', origin_lang_id: 1 };
            mockGetUserSettingsService.mockResolvedValueOnce(mockSettings);

            // Act
            await getUserSettings(req, res);

            // Assert
            expect(res.json).toHaveBeenCalledWith(mockSettings);
            expect(res.json).not.toHaveBeenCalledWith({ settings: mockSettings });
        });
    });
});
