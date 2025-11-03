import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Create mock function that will be used in the module mock
const mockCreateSBClient = jest.fn();

// Mock the supabaseClient module using unstable_mockModule
jest.unstable_mockModule('../../../supabaseClient.js', () => ({
    createSBClient: mockCreateSBClient
}));

// Import the handlers after mocking
const { getLanguageTranslations } = await import('../languages.handlers.js');

describe('getLanguageTranslations Handler', () => {
    let mockSupabase: any;
    let req: any;
    let res: any;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Setup mock request and response
        req = {
            token: 'mock-jwt-token'
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };

        // Setup mock Supabase client with proper chaining
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn()
        };

        mockCreateSBClient.mockReturnValue(mockSupabase);
    });

    describe('successful requests', () => {
        it('should return language translations data with status 200', async () => {
            // Arrange
            const mockData = [
                { id: 1, language_id: 1, translation: 'English' },
                { id: 2, language_id: 2, translation: 'Spanish' }
            ];
            mockSupabase.select.mockResolvedValueOnce({ data: mockData, error: null });

            // Act
            await getLanguageTranslations(req, res);

            // Assert
            expect(mockCreateSBClient).toHaveBeenCalledWith('mock-jwt-token');
            expect(mockSupabase.from).toHaveBeenCalledWith('language_translations');
            expect(mockSupabase.select).toHaveBeenCalledWith('*');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(mockData);
        });

        it('should use the token from request', async () => {
            // Arrange
            const customToken = 'custom-token-xyz';
            req.token = customToken;
            mockSupabase.select.mockResolvedValueOnce({ data: [], error: null });

            // Act
            await getLanguageTranslations(req, res);

            // Assert
            expect(mockCreateSBClient).toHaveBeenCalledWith(customToken);
        });

        it('should return empty array when no translations exist', async () => {
            // Arrange
            mockSupabase.select.mockResolvedValueOnce({ data: [], error: null });

            // Act
            await getLanguageTranslations(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith([]);
        });
    });

    describe('error handling', () => {
        it('should return 500 when database query fails', async () => {
            // Arrange
            const errorMessage = 'Database connection failed';
            mockSupabase.select.mockResolvedValueOnce({
                data: null,
                error: { message: errorMessage }
            });

            // Act
            await getLanguageTranslations(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
        });

        it('should handle network errors', async () => {
            // Arrange
            mockSupabase.select.mockResolvedValueOnce({
                data: null,
                error: { message: 'Network error' }
            });

            // Act
            await getLanguageTranslations(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Network error' });
        });

        it('should handle permission errors', async () => {
            // Arrange
            mockSupabase.select.mockResolvedValueOnce({
                data: null,
                error: { message: 'Permission denied' }
            });

            // Act
            await getLanguageTranslations(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Permission denied' });
        });
    });

    describe('response format', () => {
        it('should return data without wrapping in additional object', async () => {
            // Arrange
            const mockData = [{ id: 1, language_id: 1, translation: 'Test' }];
            mockSupabase.select.mockResolvedValueOnce({ data: mockData, error: null });

            // Act
            await getLanguageTranslations(req, res);

            // Assert
            expect(res.send).toHaveBeenCalledWith(mockData);
            expect(res.send).not.toHaveBeenCalledWith({ data: mockData });
        });
    });
});
