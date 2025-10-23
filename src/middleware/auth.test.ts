// Mock user service and use it in valid/expired token tests
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

let authenticateToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
let mockGetUserFromToken: jest.Mock;
let mockCreateSBClient: jest.Mock;
let mockAuthGetUser: jest.MockedFunction<() => Promise<{ data: { user: { id: string } } | null; error: any }>>;

describe('authenticateToken Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: jest.MockedFunction<NextFunction>;

    beforeEach(async () => {
        jest.resetModules();
        jest.resetAllMocks();

        mockRequest = { headers: {} };
        mockResponse = { status: jest.fn().mockReturnThis() as any, json: jest.fn().mockReturnThis() as any };
        mockNext = jest.fn() as unknown as jest.MockedFunction<NextFunction>;

        mockAuthGetUser = jest.fn(async () => ({
            data: { user: { id: 'user-1' } },
            error: null
        }));

        mockCreateSBClient = jest.fn(() => ({
            auth: { getUser: mockAuthGetUser }
        }));

        // Supabase client mock
        jest.unstable_mockModule('../supabaseClient.js', () => ({
            createSBClient: mockCreateSBClient
        }));

        // User service mock — critical for expectations
        mockGetUserFromToken = jest.fn().mockResolvedValue({ id: 'user-1', email: 'u@example.com' });
        jest.unstable_mockModule('../services/user.service.js', () => ({
            getUserFromToken: mockGetUserFromToken
        }));

        ({ authenticateToken } = await import('./auth.js'));
    });

    describe('Valid Token Scenarios', () => {
        it('should extract token and attach user, then call next()', async () => {
            const validToken = 'valid-jwt-token-123';
            mockRequest.headers = { authorization: `Bearer ${validToken}` };

            await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockGetUserFromToken).toHaveBeenCalledWith(validToken);
            expect((mockRequest as any).token).toBe(validToken);
            expect((mockRequest as any).user).toEqual({ id: 'user-1', email: 'u@example.com' });
            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(mockResponse.json).not.toHaveBeenCalled();
        });

        it('should handle Bearer token with extra spaces', async () => {
            const validToken = 'token-with-spaces';
            mockRequest.headers = { authorization: `Bearer   ${validToken}` };

            await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

            expect((mockRequest as any).token).toBe(validToken);
            expect(mockGetUserFromToken).toHaveBeenCalledWith(validToken);
            expect(mockNext).toHaveBeenCalledTimes(1);
        });
    });

    describe('Expired Token', () => {
        it('should return 401 when token is expired', async () => {
            const expiredToken = 'expired-token';
            mockRequest.headers = { authorization: `Bearer ${expiredToken}` };

            // Make user service report expiration
            mockGetUserFromToken.mockRejectedValue(new Error('JWT expired'));

            await authenticateToken(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized: token expired' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('Missing Authorization Header', () => {
        it('should return 401 when authorization header is missing', async () => {
            // Arrange
            mockRequest.headers = {}; // No authorization header

            // Act
            await authenticateToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRequest.token).toBeUndefined();
        });

        it('should return 401 when authorization header is undefined', async () => {
            // Arrange
            mockRequest.headers = {
                authorization: undefined
            } as any;

            // Act
            await authenticateToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('Malformed Authorization Header', () => {
        it('should return 401 when authorization header does not start with "Bearer "', async () => {
            // Arrange
            mockRequest.headers = {
                authorization: 'Basic dXNlcjpwYXNz' // Basic auth instead of Bearer
            };

            // Act
            await authenticateToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            expect(mockNext).not.toHaveBeenCalled();
            expect(mockRequest.token).toBeUndefined();
        });

        it('should return 401 when authorization header is just "Bearer" without token', async () => {
            // Arrange
            mockRequest.headers = {
                authorization: 'Bearer'
            };

            // Act
            await authenticateToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 401 when authorization header is "Bearer " with only spaces', async () => {
            // Arrange
            mockRequest.headers = {
                authorization: 'Bearer  ' // Only spaces after Bearer
            };

            // Act
            await authenticateToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 401 when token is just a raw token without Bearer prefix', async () => {
            // Arrange
            mockRequest.headers = {
                authorization: 'just-a-raw-token'
            };

            // Act
            await authenticateToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 401 when authorization header is empty string', async () => {
            // Arrange
            mockRequest.headers = {
                authorization: ''
            };

            // Act
            await authenticateToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('Case Sensitivity', () => {
        it('should return 401 for "bearer" (lowercase)', async () => {
            // Arrange
            mockRequest.headers = {
                authorization: 'bearer valid-token'
            };

            // Act
            await authenticateToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 401 for "BEARER" (uppercase)', async () => {
            // Arrange
            mockRequest.headers = {
                authorization: 'BEARER valid-token'
            };

            // Act
            await authenticateToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('Exception Handling', () => {
        it('should handle exceptions and return 401 with "Invalid or missing token" message', async () => {
            // Arrange
            const mockRequestWithError = {
                get headers() {
                    throw new Error('Simulated error');
                }
            };

            // Act
            await authenticateToken(
                mockRequestWithError as unknown as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid or missing token' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should handle null authorization header gracefully', async () => {
            // Arrange
            mockRequest.headers = {
                authorization: null as any
            };

            // Act
            await authenticateToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('Response Behavior', () => {
        it('should not return the response object (should return void)', async () => {
            // Arrange
            mockRequest.headers = {};

            // Act
            const result = await authenticateToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(result).toBeUndefined();
        });

        it('should chain response methods correctly', async () => {
            // Arrange
            mockRequest.headers = {};

            // Act
            await authenticateToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            expect(mockResponse.status).toHaveReturnedWith(mockResponse);
        });
    });

    describe('Token Assignment', () => {
        it('should assign extracted token to request.token property', async () => {
            // Arrange
            const testToken = 'test-token-assignment';
            mockRequest.headers = {
                authorization: `Bearer ${testToken}`
            };

            // Act
            await authenticateToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(mockRequest.token).toBe(testToken);
            expect(mockRequest.token).toBeDefined();
            expect(typeof mockRequest.token).toBe('string');
        });

        it('should not assign token property when authentication fails', async () => {
            // Arrange
            mockRequest.headers = {};

            // Act
            await authenticateToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(mockRequest.token).toBeUndefined();
        });
    });
});