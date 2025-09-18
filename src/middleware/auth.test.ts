import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { authenticateToken } from './auth.js';

describe('authenticateToken Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: jest.MockedFunction<NextFunction>;

    beforeEach(() => {
        // Reset mocks before each test
        mockRequest = {
            headers: {}
        };

        mockResponse = {
            status: jest.fn().mockReturnThis() as unknown as (code: number) => Response,
            json: jest.fn().mockReturnThis() as unknown as Response['json']
        };

        mockNext = jest.fn() as unknown as jest.MockedFunction<NextFunction>;
    });

    describe('Valid Token Scenarios', () => {
        it('should extract token from valid Bearer authorization header and call next()', () => {
            // Arrange
            const validToken = 'valid-jwt-token-123';
            mockRequest.headers = {
                authorization: `Bearer ${validToken}`
            };

            // Act
            authenticateToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(mockRequest.token).toBe(validToken);
            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(mockResponse.json).not.toHaveBeenCalled();
        });

        it('should handle Bearer token with extra spaces', () => {
            // Arrange
            const validToken = 'token-with-spaces';
            mockRequest.headers = {
                authorization: `Bearer   ${validToken}`
            };

            // Act
            authenticateToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(mockRequest.token).toBe(validToken); // Spaces should be trimmed
            expect(mockNext).toHaveBeenCalledTimes(1);
        });
    });

    describe('Missing Authorization Header', () => {
        it('should return 401 when authorization header is missing', () => {
            // Arrange
            mockRequest.headers = {}; // No authorization header

            // Act
            authenticateToken(
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

        it('should return 401 when authorization header is undefined', () => {
            // Arrange
            mockRequest.headers = {
                authorization: undefined
            };

            // Act
            authenticateToken(
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
        it('should return 401 when authorization header does not start with "Bearer "', () => {
            // Arrange
            mockRequest.headers = {
                authorization: 'Basic dXNlcjpwYXNz' // Basic auth instead of Bearer
            };

            // Act
            authenticateToken(
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

        it('should return 401 when authorization header is just "Bearer" without token', () => {
            // Arrange
            mockRequest.headers = {
                authorization: 'Bearer'
            };

            // Act
            authenticateToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 401 when authorization header is "Bearer " with only spaces', () => {
            // Arrange
            mockRequest.headers = {
                authorization: 'Bearer  ' // Only spaces after Bearer
            };

            // Act
            authenticateToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 401 when token is just a raw token without Bearer prefix', () => {
            // Arrange
            mockRequest.headers = {
                authorization: 'just-a-raw-token'
            };

            // Act
            authenticateToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 401 when authorization header is empty string', () => {
            // Arrange
            mockRequest.headers = {
                authorization: ''
            };

            // Act
            authenticateToken(
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
        it('should return 401 for "bearer" (lowercase)', () => {
            // Arrange
            mockRequest.headers = {
                authorization: 'bearer valid-token'
            };

            // Act
            authenticateToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 401 for "BEARER" (uppercase)', () => {
            // Arrange
            mockRequest.headers = {
                authorization: 'BEARER valid-token'
            };

            // Act
            authenticateToken(
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
        it('should handle exceptions and return 401 with "Invalid token" message', () => {
            // Arrange
            const mockRequestWithError = {
                get headers() {
                    throw new Error('Simulated error');
                }
            };

            // Act
            authenticateToken(
                mockRequestWithError as unknown as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid token' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should handle null authorization header gracefully', () => {
            // Arrange
            mockRequest.headers = {
                authorization: null as any
            };

            // Act
            authenticateToken(
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
        it('should not return the response object (should return void)', () => {
            // Arrange
            mockRequest.headers = {};

            // Act
            const result = authenticateToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(result).toBeUndefined();
        });

        it('should chain response methods correctly', () => {
            // Arrange
            mockRequest.headers = {};

            // Act
            authenticateToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
            // Verify chaining works
            expect(mockResponse.status).toHaveReturnedWith(mockResponse);
        });
    });

    describe('Token Assignment', () => {
        it('should assign extracted token to request.token property', () => {
            // Arrange
            const testToken = 'test-token-assignment';
            mockRequest.headers = {
                authorization: `Bearer ${testToken}`
            };

            // Act
            authenticateToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(mockRequest.token).toBe(testToken);
            expect(mockRequest.token).toBeDefined();
            expect(typeof mockRequest.token).toBe('string');
        });

        it('should not assign token property when authentication fails', () => {
            // Arrange
            mockRequest.headers = {};

            // Act
            authenticateToken(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // Assert
            expect(mockRequest.token).toBeUndefined();
        });
    });
});